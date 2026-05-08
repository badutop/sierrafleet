import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, User, Phone, CreditCard, Route, Pencil, Trash2, Upload, ExternalLink, Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusLabels = { actif: "Actif", inactif: "Inactif", en_mission: "En mission" };
const statusColors = { actif: "bg-emerald-500/10 text-emerald-600", inactif: "bg-muted text-muted-foreground", en_mission: "bg-blue-500/10 text-blue-600" };

const emptyForm = {
  prenom: "", nom: "", telephone: "", numero_permis: "", categorie_permis: "",
  date_expiration_permis: "", date_embauche: "", contact_urgence_nom: "",
  contact_urgence_telephone: "", statut: "actif",
  doc_permis_url: "", doc_cni_url: "",
};

function DocUploadField({ label, value, fieldKey, onUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUploaded(fieldKey, file_url);
    setUploading(false);
    toast.success(`${label} uploadé`);
  };

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs justify-start"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Upload className="w-3 h-3 mr-1.5" />}
          {uploading ? "Upload..." : value ? "Remplacer" : "Scanner / Importer"}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="outline" className="h-8 px-2" asChild>
            <a href={value} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
          </Button>
        )}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={handleFile} />
      </div>
      {value && <p className="text-[10px] text-emerald-600 mt-0.5">✓ Document enregistré</p>}
    </div>
  );
}

export default function Drivers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.TripLog.list("-date_depart", 200) });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Driver.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); closeDialog(); toast.success("Chauffeur ajouté"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Driver.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); closeDialog(); toast.success("Chauffeur modifié"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Driver.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); toast.success("Chauffeur supprimé"); },
  });

  const openCreate = () => { setEditingDriver(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (d) => { setEditingDriver(d); setForm({ ...emptyForm, ...d }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingDriver(null); setForm(emptyForm); };

  const handleSave = () => {
    if (editingDriver) updateMutation.mutate({ id: editingDriver.id, data: form });
    else createMutation.mutate(form);
  };

  const handleDelete = (d) => {
    if (confirm(`Supprimer le chauffeur ${d.prenom} ${d.nom} ?`)) deleteMutation.mutate(d.id);
  };

  const handleDocUploaded = (fieldKey, url) => {
    setForm(f => ({ ...f, [fieldKey]: url }));
  };

  const driverStats = {};
  trips.forEach(t => {
    if (!driverStats[t.driver_id]) driverStats[t.driver_id] = { km: 0, missions: 0 };
    driverStats[t.driver_id].km += t.km_parcourus || 0;
    driverStats[t.driver_id].missions += 1;
  });

  // Map driver -> vehicles assigned
  const driverVehicles = {};
  vehicles.forEach(v => {
    if (v.driver_id) {
      if (!driverVehicles[v.driver_id]) driverVehicles[v.driver_id] = [];
      driverVehicles[v.driver_id].push(v);
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chauffeurs</h1>
          <p className="text-sm text-muted-foreground">{drivers.length} chauffeurs</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {drivers.map(d => {
          const stats = driverStats[d.id] || { km: 0, missions: 0 };
          const now = new Date();
          const permisExpiry = d.date_expiration_permis ? new Date(d.date_expiration_permis) : null;
          const daysLeft = permisExpiry ? Math.floor((permisExpiry - now) / 86400000) : null;
          const assignedVehicles = driverVehicles[d.id] || [];

          return (
            <Card key={d.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{d.prenom} {d.nom}</CardTitle>
                      <p className="text-xs text-muted-foreground">Permis {d.categorie_permis || "-"}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px]", statusColors[d.statut])}>{statusLabels[d.statut]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{d.telephone || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" />Permis</span><span className={cn("font-medium", daysLeft !== null && daysLeft < 60 && "text-destructive")}>{d.date_expiration_permis || "-"}{daysLeft !== null && daysLeft < 60 ? ` (${daysLeft}j)` : ""}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Route className="w-3 h-3" />Km total</span><span className="font-medium">{stats.km.toLocaleString("fr-FR")} km</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Missions</span><span className="font-medium">{stats.missions}</span></div>

                {/* Véhicules affectés */}
                {assignedVehicles.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <Truck className="w-3 h-3 text-muted-foreground" />
                    {assignedVehicles.map(v => (
                      <Badge key={v.id} variant="outline" className="text-[10px] font-mono">{v.code_camion || v.immatriculation}</Badge>
                    ))}
                  </div>
                )}

                {/* Documents */}
                <div className="flex gap-2 pt-1">
                  {d.doc_permis_url && <a href={d.doc_permis_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline flex items-center gap-0.5"><ExternalLink className="w-3 h-3" />Permis</a>}
                  {d.doc_cni_url && <a href={d.doc_cni_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline flex items-center gap-0.5"><ExternalLink className="w-3 h-3" />CNI</a>}
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(d)}>
                    <Pencil className="w-3 h-3 mr-1" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(d)} disabled={deleteMutation.isPending}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDriver ? "Modifier le chauffeur" : "Nouveau chauffeur"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[["prenom","Prénom"],["nom","Nom"],["telephone","Téléphone"],["numero_permis","N° Permis"],["categorie_permis","Catégorie permis"]].map(([k, l]) => (
              <div key={k}><Label className="text-xs">{l}</Label><Input className="mt-1" value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
            <div>
              <Label className="text-xs">Expiration permis</Label>
              <Input type="date" className="mt-1" value={form.date_expiration_permis || ""} onChange={e => setForm({ ...form, date_expiration_permis: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Date d'embauche</Label>
              <Input type="date" className="mt-1" value={form.date_embauche || ""} onChange={e => setForm({ ...form, date_embauche: e.target.value })} />
            </div>

            {/* Documents obligatoires */}
            <div className="col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Documents d'identité</p>
            </div>
            <DocUploadField label="Scan Permis de conduire" value={form.doc_permis_url} fieldKey="doc_permis_url" onUploaded={handleDocUploaded} />
            <DocUploadField label="Scan CNI (Carte Nationale d'Identité)" value={form.doc_cni_url} fieldKey="doc_cni_url" onUploaded={handleDocUploaded} />

            {/* Contact urgence */}
            <div className="col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Contact d'urgence</p>
            </div>
            <div>
              <Label className="text-xs">Nom du contact</Label>
              <Input className="mt-1" placeholder="Nom & prénom" value={form.contact_urgence_nom || ""} onChange={e => setForm({ ...form, contact_urgence_nom: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Téléphone urgence</Label>
              <Input className="mt-1" placeholder="+221..." value={form.contact_urgence_telephone || ""} onChange={e => setForm({ ...form, contact_urgence_telephone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Statut</Label>
              <Select value={form.statut || "actif"} onValueChange={v => setForm({ ...form, statut: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={closeDialog}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleSave} disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}