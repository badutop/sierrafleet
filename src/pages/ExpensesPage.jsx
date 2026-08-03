import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Receipt, Pencil, Trash2, CheckCircle, XCircle, FileStack, Truck, ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ExpenseValidationPanel from "@/components/expenses/ExpenseValidationPanel";
import { confirm } from "@/lib/confirm";
import { logAudit } from "@/lib/auditLog";
import { displayThousands, parseThousandsInput } from "@/lib/numberFormat";

// "achat_pieces" n'apparaît pas dans typeLabelsForm : ce poste est généré
// automatiquement au paiement d'une facture fournisseur (Commandes Garage),
// pas saisi manuellement ici.
const typeLabels = { carburant: "Carburant", peage: "Péage", rations: "Rations", contravention: "Contravention", transport: "Transport", achat_pieces: "Achat pièces garage", autre: "Autre" };
const typeLabelsForm = { peage: "Péage", rations: "Rations", contravention: "Contravention", transport: "Transport", autre: "Autre" };
const typeColors = { carburant: "bg-orange-500/10 text-orange-600", peage: "bg-blue-500/10 text-blue-600", rations: "bg-green-500/10 text-green-600", contravention: "bg-red-500/10 text-red-600", transport: "bg-purple-500/10 text-purple-600", achat_pieces: "bg-cyan-500/10 text-cyan-600", autre: "bg-muted text-muted-foreground" };
const statutLabels = { en_attente: "En attente", valide: "Validé", rejete: "Rejeté" };
const statutColors = { en_attente: "bg-amber-500/10 text-amber-600", valide: "bg-emerald-500/10 text-emerald-600", rejete: "bg-destructive/10 text-destructive" };

const emptyForm = { vehicle_id: "", driver_id: "", type_frais: "peage", date_frais: "", montant: "", description: "", statut: "en_attente" };

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("date_frais", { ascending: false }).limit(200);
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
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("expenses").insert({ id, ...data });
      if (error) throw error;
      await logAudit("Frais", id, "create", data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); closeDialog(); toast.success("Frais ajouté"); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, oldData }) => {
      const { error } = await supabase.from("expenses").update(data).eq("id", id);
      if (error) throw error;
      await logAudit("Frais", id, "update", data, oldData, Object.keys(data));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); closeDialog(); toast.success("Frais modifié"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (expense) => {
      const { error } = await supabase.from("expenses").delete().eq("id", expense.id);
      if (error) throw error;
      await logAudit("Frais", expense.id, "delete", null, expense);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Frais supprimé"); },
  });

  const [viewOnly, setViewOnly] = useState(false);
  const openCreate = () => { setViewOnly(false); setEditingExpense(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e) => { setViewOnly(false); setEditingExpense(e); setForm({ ...emptyForm, ...e }); setDialogOpen(true); };
  const openView = (e) => { setViewOnly(true); setEditingExpense(e); setForm({ ...emptyForm, ...e }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingExpense(null); setForm(emptyForm); setViewOnly(false); };

  const handleSave = () => {
    // After modification of a rejected expense, resubmit it for validation
    const statut = editingExpense ? "en_attente" : "en_attente";
    const data = { ...form, montant: Number(form.montant || 0), statut };
    if (editingExpense) updateMutation.mutate({ id: editingExpense.id, data, oldData: editingExpense });
    else createMutation.mutate(data);
  };

  const handleValidate = (id) => {
    const oldData = expenses.find(e => e.id === id);
    updateMutation.mutate({ id, data: { statut: "valide" }, oldData });
    toast.success("Frais validé");
  };

  const handleReject = (id) => {
    const oldData = expenses.find(e => e.id === id);
    updateMutation.mutate({ id, data: { statut: "rejete" }, oldData });
    toast.error("Frais rejeté");
  };

  const handleDeleteExpense = async (id) => {
    const expense = expenses.find(e => e.id === id);
    if (await confirm("Supprimer ce frais ?")) deleteMutation.mutate(expense);
  };

  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v.immatriculation]));
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, `${d.prenom} ${d.nom}`]));

  const matchesSearch = (e) =>
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    vehicleMap[e.vehicle_id]?.toLowerCase().includes(search.toLowerCase());
  const matchesType = (e) => filterType === "all" || e.type_frais === filterType;

  const pendingExpenses = expenses.filter(e =>
    e.statut !== "valide" && matchesSearch(e) && matchesType(e)
  );
  const validatedExpenses = expenses.filter(e =>
    e.statut === "valide" && matchesSearch(e) && matchesType(e)
  );

  const totalPending = pendingExpenses.reduce((s, e) => s + (e.montant || 0), 0);
  const totalValidated = validatedExpenses.reduce((s, e) => s + (e.montant || 0), 0);
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-secondary" />
            Frais
          </h1>
          <p className="text-sm text-muted-foreground">{pendingExpenses.length} à valider · {validatedExpenses.length} validés</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}

          </SelectContent>
        </Select>

      </div>

      {/* Frais à valider */}
      <div>
        <h2 className="text-base font-semibold mb-3">En attente / Rejetés <span className="text-muted-foreground font-normal text-sm">({pendingExpenses.length} · {totalPending.toLocaleString("fr-FR")} FCFA)</span></h2>
        <div className="grid gap-4">
          {pendingExpenses.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun frais en attente de validation</p>
            </div>
          ) : (
            pendingExpenses.map(e => (
              <div key={e.id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4 border-b border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Date</p>
                        <p className="font-medium">{e.date_frais}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Type</p>
                        <Badge className={cn("text-[10px]", typeColors[e.type_frais])}>{typeLabels[e.type_frais]}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Véhicule</p>
                        <p className="font-medium">{vehicleMap[e.vehicle_id] || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Chauffeur</p>
                        <p className="font-medium">{driverMap[e.driver_id] || "-"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">Montant</p>
                      <p className="text-lg font-bold text-secondary">{(e.montant || 0).toLocaleString("fr-FR")} FCFA</p>
                    </div>
                  </div>
                  {e.description && <p className="text-xs text-muted-foreground mt-2">Description: {e.description}</p>}
                </div>
                <div className="p-4 border-t border-border">
                  <ExpenseValidationPanel
                    expense={e}
                    onValidate={handleValidate}
                    onReject={handleReject}
                    onEdit={openEdit}
                    onDelete={handleDeleteExpense}
                    isPending={updateMutation.isPending || deleteMutation.isPending}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Frais validés */}
      {validatedExpenses.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Frais validés <span className="text-muted-foreground font-normal text-sm">({validatedExpenses.length} · {totalValidated.toLocaleString("fr-FR")} FCFA)</span></h2>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="divide-x divide-border">
                  <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Type</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Véhicule</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Chauffeur</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Montant</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {validatedExpenses.map(e => (
                  <tr key={e.id} className="border-b divide-x divide-border hover:bg-muted/30">
                    <td className="px-4 py-2.5">{e.date_frais}</td>
                    <td className="px-4 py-2.5"><Badge className={cn("text-[10px]", typeColors[e.type_frais])}>{typeLabels[e.type_frais]}</Badge></td>
                    <td className="px-4 py-2.5">{vehicleMap[e.vehicle_id] || "-"}</td>
                    <td className="px-4 py-2.5">{driverMap[e.driver_id] || "-"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.description || "-"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-secondary">{(e.montant || 0).toLocaleString("fr-FR")} FCFA</td>
                    <td className="px-4 py-2.5 text-center">
                     <div className="flex gap-1 justify-center">
                       <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => openView(e)}>
                         <Receipt className="w-3 h-3 mr-1" /> Consulter
                       </Button>
                     </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
          <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-secondary shrink-0" />
            <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
              {viewOnly ? "Consulter le frais" : editingExpense ? "Modifier le frais" : "Nouveau frais"}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {viewOnly ? "Détails de ce frais déjà validé" : editingExpense ? "Mettez à jour ce frais" : "Renseignez les informations du nouveau frais"}
          </p>

          <div className="space-y-3 mt-2">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-primary flex items-center gap-1.5"><FileStack className="w-4 h-4" />Détails du frais</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type de frais {!viewOnly && <span className="text-green-600 font-bold">*</span>}</Label>
                  <Select
                    value={form.type_frais}
                    onValueChange={v => !viewOnly && setForm(f => ({ ...f, type_frais: v }))}
                    disabled={viewOnly}
                  >
                    <SelectTrigger className="mt-1 bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(typeLabelsForm).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Date {!viewOnly && <span className="text-green-600 font-bold">*</span>}</Label>
                  <Input type="date" className="mt-1 bg-card" value={form.date_frais} onChange={e => setForm({ ...form, date_frais: e.target.value })} disabled={viewOnly} />
                </div>
                <div>
                  <Label className="text-xs">Montant (FCFA) {!viewOnly && <span className="text-green-600 font-bold">*</span>}</Label>
                  <Input
                    type="text" inputMode="numeric" className="mt-1 bg-card"
                    value={displayThousands(form.montant)}
                    onChange={e => setForm({ ...form, montant: parseThousandsInput(e.target.value) ?? "" })}
                    disabled={viewOnly}
                  />
                </div>
                <div>
                  <Label className="text-xs">Statut</Label>
                  <div className="mt-1 h-9 flex items-center px-3 rounded-md border border-input bg-card text-sm">
                    <span className={cn(statutColors[form.statut], "px-2 py-0.5 rounded text-xs font-medium")}>{statutLabels[form.statut] || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5"><Truck className="w-4 h-4" />Affectation</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Véhicule {!viewOnly && <span className="text-green-600 font-bold">*</span>}</Label>
                  <Select
                    value={form.vehicle_id || ""}
                    onValueChange={v => {
                      if (viewOnly) return;
                      const vehicle = vehicles.find(x => x.id === v);
                      setForm(f => ({ ...f, vehicle_id: v, driver_id: vehicle?.driver_id || "" }));
                    }}
                    disabled={viewOnly}
                  >
                    <SelectTrigger className="mt-1 bg-card"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Chauffeur <span className="font-normal text-muted-foreground">(auto — véhicule)</span></Label>
                  <div className="mt-1 h-9 flex items-center px-3 rounded-md border border-input bg-card text-sm text-muted-foreground">
                    {form.vehicle_id ? (driverMap[form.driver_id] || "Aucun chauffeur affecté à ce véhicule") : "Sélectionnez d'abord un véhicule"}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">
                {form.type_frais === "autre" ? "Libellé" : "Description"}
                {form.type_frais === "autre" && !viewOnly && <span className="text-green-600 font-bold"> *</span>}
              </Label>
              <Input
                className="mt-1"
                placeholder={form.type_frais === "autre" ? "Précisez la nature de ce frais" : undefined}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                disabled={viewOnly}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={closeDialog}>
              <ArrowLeft className="w-4 h-4 mr-2" /> {viewOnly ? "Fermer" : "Annuler"}
            </Button>
            {!viewOnly && (
              <Button className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleSave} disabled={isPending || !form.montant || !form.date_frais || !form.vehicle_id || (form.type_frais === "autre" && !form.description)}>
                <Save className="w-4 h-4 mr-2" />
                {isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}