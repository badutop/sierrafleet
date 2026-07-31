import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, User, Users, Pencil, Trash2, FileText, Search, IdCard, PhoneCall, ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import DriverPhotoField from "@/components/drivers/DriverPhotoField";
import DriverDocuments from "@/components/drivers/DriverDocuments";
import { confirm } from "@/lib/confirm";
import { logAudit } from "@/lib/auditLog";


const statusLabels = { actif: "Actif", inactif: "Inactif", en_mission: "En mission" };
const statusColors = { actif: "bg-emerald-500/10 text-emerald-600", inactif: "bg-muted text-muted-foreground", en_mission: "bg-blue-500/10 text-blue-600" };

const emptyForm = {
  prenom: "", nom: "", telephone: "", numero_permis: "", categorie_permis: "",
  date_expiration_permis: "", date_embauche: "", contact_urgence_nom: "",
  contact_urgence_telephone: "", statut: "actif", photo_url: "",
};

export default function Drivers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [docsDriverId, setDocsDriverId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      // Tri stable (alphabétique) — sans lui, Postgres ne garantit aucun
      // ordre après une mise à jour (ex: scan de document), donnant
      // l'impression qu'une ligne modifiée a "disparu" alors qu'elle a juste
      // changé de position dans la liste.
      const { data, error } = await supabase.from("drivers").select("*").order("nom", { ascending: true }).order("prenom", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  // Dérivé de la liste vivante (pas un simple snapshot figé à l'ouverture) —
  // sinon la dialogue Documents affiche encore "Aucun document" après un
  // scan/upload réussi, tant qu'elle n'est pas rouverte.
  const docsDriver = drivers.find(d => d.id === docsDriverId) || null;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: row, error } = await supabase.from("drivers").insert({ id: crypto.randomUUID(), ...data }).select().single();
      if (error) throw error;
      await logAudit("Chauffeur", row.id, "create", row);
      return row;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); closeDialog(); toast.success("Chauffeur ajouté"); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, oldData }) => {
      const { error } = await supabase.from("drivers").update(data).eq("id", id);
      if (error) throw error;
      await logAudit("Chauffeur", id, "update", data, oldData, Object.keys(data));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); closeDialog(); toast.success("Chauffeur modifié"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (driver) => {
      const { error } = await supabase.from("drivers").delete().eq("id", driver.id);
      if (error) throw error;
      await logAudit("Chauffeur", driver.id, "delete", null, driver);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); toast.success("Chauffeur supprimé"); },
  });

  const openCreate = () => { setEditingDriver(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (d) => { setEditingDriver(d); setForm({ ...emptyForm, ...d }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingDriver(null); setForm(emptyForm); };

  const handleSave = () => {
    // Postgres rejette "" pour les colonnes date (l'ancien backend l'acceptait) — on convertit en null.
    const dateFields = ["date_expiration_permis", "date_embauche"];
    const data = { ...form };
    dateFields.forEach(f => { if (data[f] === "") data[f] = null; });
    if (editingDriver) updateMutation.mutate({ id: editingDriver.id, data, oldData: editingDriver });
    else createMutation.mutate(data);
  };

  const handleDelete = async (d) => {
    if (await confirm(`Supprimer le chauffeur ${d.prenom} ${d.nom} ?`)) deleteMutation.mutate(d);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filteredDrivers = drivers.filter(d =>
    `${d.prenom} ${d.nom}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-secondary" />
            Chauffeurs
          </h1>
          <p className="text-sm text-muted-foreground">{drivers.length} chauffeurs</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un chauffeur..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Date d'embauche</TableHead>
                <TableHead>Expiration permis</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.map(d => {
                const now = new Date();
                const permisExpiry = d.date_expiration_permis ? new Date(d.date_expiration_permis) : null;
                const daysLeft = permisExpiry ? Math.floor((permisExpiry - now) / 86400000) : null;

                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {d.photo_url ? (
                            <img src={d.photo_url} alt={`${d.prenom} ${d.nom}`} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="font-medium text-sm">{d.prenom} {d.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{d.date_embauche || "-"}</TableCell>
                    <TableCell className="text-xs">
                      <span className={cn(daysLeft !== null && daysLeft < 60 && "text-destructive font-medium")}>
                        {daysLeft !== null ? `${daysLeft} j` : "-"}
                      </span>
                    </TableCell>
                    <TableCell><Badge className={cn("text-[10px]", statusColors[d.statut])}>{statusLabels[d.statut]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(d)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn("h-7 text-xs", (d.doc_permis_url || d.doc_cni_url) ? "text-blue-600 border-blue-200 hover:bg-blue-50" : "")}
                          onClick={() => setDocsDriverId(d.id)}
                          title="Documents"
                        >
                          <FileText className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(d)} disabled={deleteMutation.isPending}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
          <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
            <Users className="w-5 h-5 text-secondary shrink-0" />
            <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
              {editingDriver ? "Modifier le chauffeur" : "Nouveau chauffeur"}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {editingDriver ? "Mettez à jour les informations de ce chauffeur" : "Renseignez les informations du nouveau chauffeur"}
          </p>

          <div className="space-y-3 mt-2">
            {/* Identification */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><IdCard className="w-3.5 h-3.5" />Identification</p>
              <div className="grid grid-cols-2 gap-3">
                <DriverPhotoField value={form.photo_url} onUploaded={(url) => setForm(f => ({ ...f, photo_url: url }))} />
                {[["prenom","Prénom"],["nom","Nom"],["telephone","Téléphone"],["numero_permis","N° Permis"],["categorie_permis","Catégorie permis"]].map(([k, l]) => (
                  <div key={k}><Label className="text-xs">{l}</Label><Input className="mt-1 bg-card" value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
                ))}
                <div>
                  <Label className="text-xs">Expiration permis</Label>
                  <Input type="date" className="mt-1 bg-card" value={form.date_expiration_permis || ""} onChange={e => setForm({ ...form, date_expiration_permis: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Date d'embauche</Label>
                  <Input type="date" className="mt-1 bg-card" value={form.date_embauche || ""} onChange={e => setForm({ ...form, date_embauche: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Contact urgence */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5" />Contact d'urgence</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nom du contact</Label>
                  <Input className="mt-1 bg-card" placeholder="Nom & prénom" value={form.contact_urgence_nom || ""} onChange={e => setForm({ ...form, contact_urgence_nom: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Téléphone urgence</Label>
                  <Input className="mt-1 bg-card" placeholder="+221..." value={form.contact_urgence_telephone || ""} onChange={e => setForm({ ...form, contact_urgence_telephone: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={form.statut || "actif"} onValueChange={v => setForm({ ...form, statut: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={closeDialog}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleSave} disabled={isPending}>
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DriverDocuments
        driver={docsDriver}
        open={!!docsDriverId}
        onClose={() => setDocsDriverId(null)}
      />
    </div>
  );
}