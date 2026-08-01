import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building2, Search, Pencil, Trash2, MapPin, User, Phone, Coins, Save, IdCard, Warehouse, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import DepotsEditor from "@/components/clients/DepotsEditor";
import { confirm } from "@/lib/confirm";
import { logAudit } from "@/lib/auditLog";
import { useZones } from "@/hooks/use-zones";
import { getZoneColors } from "@/lib/zoneColors";

const emptyForm = { nom: "", code_client: "", zone: "zone1", contact_nom: "", contact_telephone: "+221 ", actif: true };

// Formate au fil de la saisie au format sénégalais "+221 XX XXX XX XX" (9
// chiffres, groupés 2-3-2-2) — ne garde que les chiffres tapés après
// l'indicatif, qui reste fixe en tête, quoi que l'utilisateur édite.
function formatSenegalPhone(raw) {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("221")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const groups = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return "+221" + (groups.length ? " " + groups.join(" ") : "");
}

// Génère le prochain code client séquentiel (ex: CLI-0009), indépendamment
// du nom (généré avant que l'utilisateur saisisse le nom du client).
const generateNextClientCode = (clients) => {
  const maxSeq = clients.reduce((max, c) => {
    const match = /^CLI-(\d+)$/.exec(c.code_client || "");
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  const next = Math.max(maxSeq, clients.length) + 1;
  return `CLI-${String(next).padStart(4, "0")}`;
};

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [depots, setDepots] = useState([]);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: allDepots = [] } = useQuery({
    queryKey: ["depots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("depots").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: zones = [] } = useZones();
  const zoneMap = Object.fromEntries(zones.map((z, i) => [z.code, { ...z, colors: getZoneColors(i) }]));

  // DepotsEditor ajoute un champ UI "_coords" qui n'existe pas en colonne —
  // à retirer avant tout insert/update Supabase (Postgrest rejette les
  // colonnes inconnues, contrairement à l'ancien backend qui les ignorait).
  const toDepotPayload = (d, clientId) => {
    const { _coords, ...rest } = d;
    return {
      ...rest,
      client_id: clientId,
      latitude: d.latitude !== "" ? parseFloat(d.latitude) : null,
      longitude: d.longitude !== "" ? parseFloat(d.longitude) : null,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: client, error } = await supabase.from("clients").insert({ id: crypto.randomUUID(), ...data }).select().single();
      if (error) throw error;
      await logAudit("Client", client.id, "create", client);
      return client;
    },
    onSuccess: async (client) => {
      if (depots.length > 0) {
        const { error } = await supabase.from("depots").insert(
          depots.map(d => ({ id: crypto.randomUUID(), ...toDepotPayload(d, client.id) }))
        );
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      closeDialog();
      toast.success("Client ajouté");
    },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data, oldData }) => {
      const { error } = await supabase.from("clients").update(data).eq("id", id);
      if (error) throw error;
      await logAudit("Client", id, "update", data, oldData, Object.keys(data));
    },
    onSuccess: async (_, { id }) => {
      const existing = allDepots.filter(d => d.client_id === id);
      if (existing.length > 0) {
        const { error: delError } = await supabase.from("depots").delete().in("id", existing.map(d => d.id));
        if (delError) throw delError;
      }
      if (depots.length > 0) {
        const { error: insError } = await supabase.from("depots").insert(
          depots.map(d => ({ id: crypto.randomUUID(), ...toDepotPayload(d, id) }))
        );
        if (insError) throw insError;
      }
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      closeDialog();
      toast.success("Client modifié");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (client) => {
      const existing = allDepots.filter(d => d.client_id === client.id);
      if (existing.length > 0) {
        const { error: delError } = await supabase.from("depots").delete().in("id", existing.map(d => d.id));
        if (delError) throw delError;
      }
      const { error } = await supabase.from("clients").delete().eq("id", client.id);
      if (error) throw error;
      await logAudit("Client", client.id, "delete", null, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      toast.success("Client supprimé");
    },
  });

  const openCreate = () => {
    setEditingClient(null);
    setForm({ ...emptyForm, code_client: generateNextClientCode(clients) });
    setDepots([]);
    setDialogOpen(true);
  };
  const openEdit = (c) => {
    setEditingClient(c);
    setForm({ ...emptyForm, ...c, contact_telephone: c.contact_telephone || "+221 " });
    setDepots(allDepots.filter(d => d.client_id === c.id).map(d => ({ ...d })));
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingClient(null); setForm(emptyForm); setDepots([]); };

  const handleSave = () => {
    const data = { ...form };
    // Pas de numéro réellement saisi au-delà de l'indicatif — ne rien enregistrer.
    if (!(data.contact_telephone || "").replace("+221", "").replace(/\D/g, "")) data.contact_telephone = null;
    if (editingClient) updateMutation.mutate({ id: editingClient.id, data, oldData: editingClient });
    else createMutation.mutate(data);
  };

  const handleDelete = async (c) => {
    if (await confirm(`Supprimer ${c.nom} ?`)) deleteMutation.mutate(c);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filteredClients = clients.filter(c =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.code_client?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-secondary" />
            Clients
          </h1>
          <p className="text-sm text-muted-foreground">{clients.filter(c => c.actif !== false).length} clients actifs</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter un client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher un client..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead><span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />Contact</span></TableHead>
                  <TableHead><span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />Zone</span></TableHead>
                  <TableHead><span className="inline-flex items-center gap-1"><Warehouse className="w-3 h-3" />Adresse</span></TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(c => {
                  const clientDepots = allDepots.filter(d => d.client_id === c.id);
                  const depotAddresses = clientDepots.map(d => d.adresse).filter(Boolean).join(", ") || "-";
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{c.nom}</p>
                            {c.code_client && <p className="text-[11px] text-muted-foreground">Code: {c.code_client}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.contact_nom || "-"}
                        {c.contact_telephone && <p className="text-muted-foreground">{c.contact_telephone}</p>}
                      </TableCell>
                      <TableCell><Badge className={cn("text-[10px]", zoneMap[c.zone]?.colors.badge)}><MapPin className="w-2.5 h-2.5 mr-1" />{zoneMap[c.zone]?.libelle || c.zone}</Badge></TableCell>
                      <TableCell className="text-xs">{depotAddresses}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(c)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredClients.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun client trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
          <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-secondary shrink-0" />
            <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
              {editingClient ? "Modifier le client" : "Nouveau client"}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {editingClient ? "Mettez à jour les informations de ce client" : "Renseignez les informations du nouveau client"}
          </p>

          <div className="space-y-3 mt-2">
            {/* Identification */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-primary flex items-center gap-1.5"><IdCard className="w-4 h-4" />Identification</p>
              <div>
                <Label className="text-xs">Code client <span className="text-muted-foreground font-normal">(généré automatiquement)</span></Label>
                <Input className="mt-1 bg-muted text-muted-foreground" value={form.code_client || ""} disabled readOnly />
              </div>
              <div>
                <Label className="text-xs">Nom du client <span className="text-green-600 font-bold">*</span></Label>
                <Input className="mt-1" placeholder="Ex: Moulins de Dakar" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
              </div>
            </div>

            {/* Zone & tarification */}
            <div className={cn("border-2 rounded-2xl p-4 space-y-3", zoneMap[form.zone]?.colors.box || "bg-muted/40 border-border")}>
              <p className="text-sm font-bold flex items-center gap-1.5"><MapPin className="w-4 h-4" />Zone & tarification</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Zone principale</Label>
                  <Select value={form.zone || "zone1"} onValueChange={v => setForm({ ...form, zone: v })}>
                    <SelectTrigger className="mt-1 bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {zones.map(z => (
                        <SelectItem key={z.code} value={z.code}>{z.libelle} — {Number(z.litrage_approximatif)} L/rotation</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Coins className="w-3 h-3" />Tarif / tonne (FCFA)</Label>
                  <Input
                    type="text" inputMode="numeric" className="mt-1 bg-card" placeholder="Ex: 15 000"
                    value={form.tarif_par_tonne != null ? Number(form.tarif_par_tonne).toLocaleString("fr-FR") : ""}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setForm({ ...form, tarif_par_tonne: digits ? Number(digits) : undefined });
                    }}
                  />
                </div>
              </div>
              <Badge className={cn("text-[10px]", zoneMap[form.zone]?.colors.badge)}>
                <MapPin className="w-2.5 h-2.5 mr-1" />{zoneMap[form.zone]?.libelle || form.zone} — conso. estimée {Number(zoneMap[form.zone]?.litrage_approximatif) || 0} L / rotation
              </Badge>
            </div>

            {/* Contact */}
            <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5"><User className="w-4 h-4" />Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nom contact</Label>
                  <Input className="mt-1 bg-card" value={form.contact_nom || ""} onChange={e => setForm({ ...form, contact_nom: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" />Téléphone contact</Label>
                  <Input
                    className="mt-1 bg-card" placeholder="+221 77 123 45 67"
                    value={form.contact_telephone || "+221 "}
                    onChange={e => setForm({ ...form, contact_telephone: formatSenegalPhone(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <DepotsEditor depots={depots} onChange={setDepots} zones={zones} />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={closeDialog}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleSave} disabled={isPending || !form.nom}>
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}