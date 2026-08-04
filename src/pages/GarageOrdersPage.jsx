import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Bell, List, Search, Eye, FileText, Send, CheckCircle2, Package, Receipt, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import GarageOrderDialog from "@/components/garage-orders/GarageOrderDialog";
import { logAudit } from "@/lib/auditLog";
import { useAuth } from "@/lib/AuthContext";
import PeriodFilter, { getDateRange, inRange } from "@/components/reports/PeriodFilter";

const now = new Date();
const defaultPeriodFilter = { mode: "all", month: now.getMonth() + 1, year: now.getFullYear(), from: "", to: "" };

const KpiBox = ({ icon: Icon, label, value, sub, color = "primary" }) => {
  const colors = {
    primary: "bg-primary/15 text-primary border-primary/25",
    amber: "bg-amber-500/15 text-amber-700 border-amber-400/25",
    purple: "bg-purple-500/15 text-purple-700 border-purple-400/25",
    green: "bg-emerald-500/15 text-emerald-700 border-emerald-400/25",
    red: "bg-destructive/15 text-destructive border-destructive/25",
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colors[color]}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium opacity-70">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        {sub && <p className="text-[11px] opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const STATUT_BADGE = {
  en_attente: "bg-blue-500/15 text-blue-700 border-blue-400/30",
  commandee: "bg-amber-500/15 text-amber-700 border-amber-400/30",
  confirmee: "bg-purple-500/15 text-purple-700 border-purple-400/30",
  recue: "bg-teal-500/15 text-teal-700 border-teal-400/30",
  facture_recue: "bg-orange-500/15 text-orange-700 border-orange-400/30",
  payee: "bg-emerald-500/15 text-emerald-700 border-emerald-400/30",
  annulee: "bg-muted text-muted-foreground",
};
const STATUT_LABEL = {
  en_attente: "En attente", commandee: "Commandée", confirmee: "Confirmée",
  recue: "Reçue", facture_recue: "Facture reçue", payee: "Payée", annulee: "Annulée",
};
const STATUT_ICON = {
  en_attente: FileText, commandee: Send, confirmee: CheckCircle2, recue: Package,
  facture_recue: Receipt, payee: Banknote, annulee: FileText,
};

export default function GarageOrdersPage() {
  const { user: currentUser } = useAuth();
  // Resp. Exploitation suit la commande jusqu'à la réception de la pièce —
  // la facture et le paiement relèvent de Finances (voir aussi
  // GarageOrderDialog.jsx pour le détail par commande).
  const canHandleInvoice = currentUser?.role === "admin" || currentUser?.role === "finances";
  const [activeTab, setActiveTab] = useState("alertes");
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState(defaultPeriodFilter);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["garage-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("garage_orders").select("*").order("created_date", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: maintenances = [] } = useQuery({
    queryKey: ["maintenances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance").select("*");
      if (error) throw error;
      return data;
    },
  });

  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));
  const maintenanceMap = Object.fromEntries(maintenances.map(m => [m.id, m]));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["garage-orders"] });

  const launchMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from("garage_orders").update({
        ...data, statut: "commandee", date_commande: new Date().toISOString().split("T")[0],
      }).eq("id", id);
      if (error) throw error;
      await logAudit("Commande Garage", id, "update", { ...data, statut: "commandee" }, null, ["statut", ...Object.keys(data)]);
    },
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Commande lancée auprès du fournisseur"); },
  });

  // Tant que la commande n'est pas envoyée (statut en_attente), le responsable
  // peut ajuster désignation/quantité/fournisseur/prix... sans la lancer.
  const saveDraftMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from("garage_orders").update(data).eq("id", id);
      if (error) throw error;
      await logAudit("Commande Garage", id, "update", data, null, Object.keys(data));
    },
    onSuccess: () => { invalidate(); toast.success("Modifications enregistrées"); },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("garage_orders").update({
        statut: "confirmee", date_confirmation: new Date().toISOString().split("T")[0],
      }).eq("id", id);
      if (error) throw error;
      await logAudit("Commande Garage", id, "update", { statut: "confirmee" }, { statut: "commandee" }, ["statut"]);
    },
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Commande confirmée par le fournisseur"); },
  });

  const receiveMutation = useMutation({
    mutationFn: async (id) => {
      const order = orders.find(o => o.id === id);
      if (!order) return;
      const { error } = await supabase.from("garage_orders").update({
        statut: "recue", date_reception: new Date().toISOString().split("T")[0],
      }).eq("id", id);
      if (error) throw error;
      await logAudit("Commande Garage", id, "update", { statut: "recue" }, { statut: order.statut }, ["statut"]);

      if (order.spare_part_id) {
        const { data: part, error: partErr } = await supabase.from("spare_parts").select("quantite_stock").eq("id", order.spare_part_id).single();
        if (!partErr && part) {
          await supabase.from("spare_parts").update({
            quantite_stock: (Number(part.quantite_stock) || 0) + (Number(order.quantite) || 0),
          }).eq("id", order.spare_part_id);
        }
      } else {
        await supabase.from("spare_parts").insert({
          id: crypto.randomUUID(),
          designation: order.designation,
          categorie: order.categorie || "autre",
          quantite_stock: Number(order.quantite) || 0,
          prix_unitaire: Number(order.prix_unitaire) || 0,
          supplier_id: order.supplier_id || null,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
    },
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Commande réceptionnée — stock mis à jour"); },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id) => {
      const order = orders.find(o => o.id === id);
      const { error } = await supabase.from("garage_orders").update({ statut: "annulee" }).eq("id", id);
      if (error) throw error;
      await logAudit("Commande Garage", id, "update", { statut: "annulee" }, { statut: order?.statut }, ["statut"]);
    },
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Commande annulée"); },
  });

  const invoiceReceivedMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from("garage_orders").update({ ...data, statut: "facture_recue" }).eq("id", id);
      if (error) throw error;
      await logAudit("Commande Garage", id, "update", { ...data, statut: "facture_recue" }, null, ["statut", ...Object.keys(data)]);
    },
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Facture enregistrée"); },
  });

  // Le paiement effectif de la facture est le fait générateur de la dépense
  // réelle : elle est créée ici dans Dépenses (Frais), déjà validée puisque
  // le paiement a bel et bien eu lieu, avec le scan de facture en justificatif.
  const paidMutation = useMutation({
    mutationFn: async (id) => {
      const order = orders.find(o => o.id === id);
      if (!order) return;
      const today = new Date().toISOString().split("T")[0];
      const expenseId = crypto.randomUUID();
      const supplierName = supplierMap[order.supplier_id]?.nom;
      const { error: expError } = await supabase.from("expenses").insert({
        id: expenseId,
        vehicle_id: order.vehicle_id || null,
        type_frais: "achat_pieces",
        date_frais: today,
        montant: Number(order.montant_facture ?? order.montant_total) || 0,
        description: supplierName ? `${order.designation} — ${supplierName}` : order.designation,
        justificatif_url: order.facture_url || null,
        statut: "valide",
      });
      if (expError) throw expError;
      await logAudit("Frais", expenseId, "create", { vehicle_id: order.vehicle_id, type_frais: "achat_pieces", montant: Number(order.montant_facture ?? order.montant_total) || 0 });
      const { error } = await supabase.from("garage_orders").update({
        statut: "payee", date_paiement: today, expense_id: expenseId,
      }).eq("id", id);
      if (error) throw error;
      await logAudit("Commande Garage", id, "update", { statut: "payee" }, { statut: order.statut }, ["statut"]);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success("Facture payée — dépense enregistrée dans Dépenses"); },
  });

  const isPending = launchMutation.isPending || saveDraftMutation.isPending || confirmMutation.isPending
    || receiveMutation.isPending || cancelMutation.isPending || invoiceReceivedMutation.isPending || paidMutation.isPending;

  const openOrder = (o) => { setSelectedOrder(o); setDialogOpen(true); };

  const alertes = orders.filter(o => o.statut === "en_attente");
  const enCours = orders.filter(o => o.statut === "commandee" || o.statut === "confirmee");
  const montantEngage = enCours.reduce((s, o) => s + (o.montant_total || 0), 0);
  const recuesMois = orders.filter(o => {
    if (o.statut !== "recue" || !o.date_reception) return false;
    const d = new Date(o.date_reception), now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const facturesAPayer = orders.filter(o => o.statut === "facture_recue")
    .sort((a, b) => new Date(a.date_echeance || 0) - new Date(b.date_echeance || 0));
  const facturesEnRetard = facturesAPayer.filter(o => o.date_echeance && new Date(o.date_echeance) < new Date());

  // Par défaut (aucun filtre de période choisi), ne montrer que les 5
  // derniers jours — comme Campagnes > Rotations et Carburant >
  // Approvisionnements. Choisir un mois/année/période libre dans
  // PeriodFilter affiche cette période complète à la place.
  const fiveDaysCutoff = new Date();
  fiveDaysCutoff.setHours(0, 0, 0, 0);
  fiveDaysCutoff.setDate(fiveDaysCutoff.getDate() - 4);
  const periodRange = periodFilter.mode !== "all" ? getDateRange(periodFilter) : null;

  const filtered = orders.filter(o => {
    const vehicle = vMap[o.vehicle_id];
    const label = `${vehicle?.code_camion || ""} ${vehicle?.immatriculation || ""} ${o.designation || ""}`.toLowerCase();
    if (!label.includes(search.toLowerCase())) return false;
    if (periodRange) return inRange(o.created_date, periodRange);
    return o.created_date && new Date(o.created_date) >= fiveDaysCutoff;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-secondary" />
            Commandes Garage
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {alertes.length} alerte(s) en attente · {enCours.length} en cours{canHandleInvoice ? ` · ${facturesAPayer.length} facture(s) à payer` : ""}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className={cn("grid grid-cols-2 gap-3", canHandleInvoice ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        <KpiBox icon={Bell} label="Alertes en attente" value={alertes.length} sub="Pièces à commander" color="primary" />
        <KpiBox icon={Send} label="Commandes en cours" value={enCours.length} sub="Commandée / Confirmée" color="amber" />
        <KpiBox icon={ShoppingCart} label="Montant engagé" value={`${montantEngage.toLocaleString("fr-FR")} FCFA`} sub="Commandes en cours" color="purple" />
        <KpiBox icon={CheckCircle2} label="Reçues ce mois" value={recuesMois.length} sub="Stock mis à jour" color="green" />
        {canHandleInvoice && (
          <KpiBox icon={Receipt} label="Factures à payer" value={facturesAPayer.length} sub={`${facturesEnRetard.length} en retard`} color={facturesEnRetard.length > 0 ? "red" : "green"} />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 flex-wrap h-auto gap-1">
          <TabsTrigger value="alertes" className="flex items-center gap-1.5 text-xs">
            <Bell className="w-3.5 h-3.5" /> Alertes
            {alertes.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {alertes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="toutes" className="flex items-center gap-1.5 text-xs">
            <List className="w-3.5 h-3.5" /> Toutes les commandes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alertes" className="mt-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Pièces à commander
              <span className="ml-auto text-muted-foreground font-normal normal-case tracking-normal">{alertes.length} en attente</span>
            </h3>
            {alertes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">✅ Aucune commande en attente.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {alertes.map(o => {
                  const vehicle = vMap[o.vehicle_id];
                  return (
                    <div key={o.id} className="bg-card border border-border rounded-xl p-4 space-y-2 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openOrder(o)}>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Bell className="w-3.5 h-3.5 text-amber-500" /> Pièce manquante en stock
                      </div>
                      <p className="font-semibold text-sm">{o.designation}</p>
                      <p className="text-xs text-muted-foreground">Quantité : {o.quantite}</p>
                      <p className="text-xs text-muted-foreground">
                        {vehicle ? `${vehicle.immatriculation}${driverMap[vehicle.driver_id] ? ` — ${driverMap[vehicle.driver_id].prenom} ${driverMap[vehicle.driver_id].nom}` : ""}` : "Véhicule non précisé"}
                      </p>
                      <Button size="sm" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs gap-1.5">
                        <Send className="w-3.5 h-3.5" /> Lancer la commande
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {canHandleInvoice && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 mt-3">
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-orange-600" />
                Factures à payer
                <span className="ml-auto text-muted-foreground font-normal normal-case tracking-normal">
                  {facturesAPayer.length} en attente{facturesEnRetard.length > 0 ? ` · ${facturesEnRetard.length} en retard` : ""}
                </span>
              </h3>
              {facturesAPayer.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">✅ Aucune facture en attente de paiement.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {facturesAPayer.map(o => {
                    const vehicle = vMap[o.vehicle_id];
                    const enRetard = o.date_echeance && new Date(o.date_echeance) < new Date();
                    return (
                      <div key={o.id} className={cn("bg-card border rounded-xl p-4 space-y-2 cursor-pointer hover:shadow-md transition-shadow", enRetard ? "border-destructive/40" : "border-border")} onClick={() => openOrder(o)}>
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <Receipt className="w-3.5 h-3.5 text-orange-600" /> Facture fournisseur
                        </div>
                        <p className="font-semibold text-sm">{o.designation}</p>
                        <p className="text-xs text-muted-foreground">
                          {vehicle ? `${vehicle.immatriculation}${driverMap[vehicle.driver_id] ? ` — ${driverMap[vehicle.driver_id].prenom} ${driverMap[vehicle.driver_id].nom}` : ""}` : "Véhicule non précisé"}
                        </p>
                        <Badge className={cn("text-[10px]", enRetard ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-amber-500/15 text-amber-700 border-amber-400/30")}>
                          Échéance : {o.date_echeance ? new Date(o.date_echeance).toLocaleDateString("fr-FR") : "—"}
                        </Badge>
                        <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                          <Banknote className="w-3.5 h-3.5" /> Marquer payée
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="toutes" className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher véhicule, pièce..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <PeriodFilter filter={periodFilter} onChange={setPeriodFilter} />
          </div>
          {periodFilter.mode === "all" && (
            <p className="text-xs text-muted-foreground">Affichage des 5 derniers jours — utilisez le filtre de période pour voir plus.</p>
          )}

          {isLoading ? (
            <div className="bg-card rounded-xl border border-border py-10 text-center">
              <div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border py-10 text-center text-muted-foreground text-sm">
              Aucune commande trouvée
            </div>
          ) : (
            <div className="space-y-6">
              {/* Regroupées par jour — même présentation que Campagnes >
                  Rotations et Carburant > Approvisionnements. */}
              {Object.entries(
                [...filtered]
                  .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
                  .reduce((acc, o) => {
                    const day = o.created_date ? new Date(o.created_date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Sans date";
                    if (!acc[day]) acc[day] = [];
                    acc[day].push(o);
                    return acc;
                  }, {})
              ).map(([day, dayOrders]) => {
                const totalMontant = dayOrders.reduce((s, o) => s + (Number(o.montant_total) || 0), 0);
                return (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground capitalize">{day}</h3>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold text-secondary">{dayOrders.length} commande{dayOrders.length > 1 ? "s" : ""}</span> — {totalMontant.toLocaleString("fr-FR")} FCFA
                      </div>
                    </div>
                    <div className="bg-card rounded-xl border border-border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Véhicule</TableHead>
                            <TableHead className="text-xs">Pièce</TableHead>
                            <TableHead className="text-xs text-right">Qté</TableHead>
                            <TableHead className="text-xs">Fournisseur</TableHead>
                            <TableHead className="text-xs text-right">Montant (FCFA)</TableHead>
                            <TableHead className="text-xs text-center">Statut</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayOrders.map(o => {
                            const vehicle = vMap[o.vehicle_id];
                            const StatutIcon = STATUT_ICON[o.statut];
                            return (
                              <TableRow key={o.id} className="hover:bg-muted/30">
                                <TableCell className="text-xs font-semibold font-mono">
                                  {vehicle?.immatriculation || "—"}
                                </TableCell>
                                <TableCell className="text-xs">{o.designation}</TableCell>
                                <TableCell className="text-xs text-right">{o.quantite}</TableCell>
                                <TableCell className="text-xs">{supplierMap[o.supplier_id]?.nom || "—"}</TableCell>
                                <TableCell className="text-xs text-right font-bold">{(o.montant_total || 0).toLocaleString("fr-FR")}</TableCell>
                                <TableCell className="text-center">
                                  <Badge className={cn("text-[10px] gap-1", STATUT_BADGE[o.statut])}>
                                    {StatutIcon && <StatutIcon className="w-3 h-3" />} {STATUT_LABEL[o.statut] || o.statut}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openOrder(o)} title="Voir détails">
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-secondary/10 font-bold">
                            <TableCell colSpan={4} className="text-right text-xs font-bold uppercase text-secondary">Total journée</TableCell>
                            <TableCell className="text-right text-sm font-bold text-secondary">{totalMontant.toLocaleString("fr-FR")}</TableCell>
                            <TableCell colSpan={2} />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GarageOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={selectedOrder}
        vMap={vMap}
        driverMap={driverMap}
        maintenanceMap={maintenanceMap}
        suppliers={suppliers}
        onLaunch={(id, data) => launchMutation.mutate({ id, data })}
        onSaveDraft={(id, data) => saveDraftMutation.mutate({ id, data })}
        onConfirm={(id) => confirmMutation.mutate(id)}
        onReceive={(id) => receiveMutation.mutate(id)}
        onInvoiceReceived={(id, data) => invoiceReceivedMutation.mutate({ id, data })}
        onPaid={(id) => paidMutation.mutate(id)}
        onCancel={(id) => cancelMutation.mutate(id)}
        isPending={isPending}
      />
    </div>
  );
}
