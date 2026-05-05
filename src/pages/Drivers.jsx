import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, User, Phone, CreditCard, Route, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusLabels = { actif: "Actif", inactif: "Inactif", en_mission: "En mission" };
const statusColors = { actif: "bg-emerald-500/10 text-emerald-600", inactif: "bg-muted text-muted-foreground", en_mission: "bg-blue-500/10 text-blue-600" };

const emptyForm = { prenom: "", nom: "", telephone: "", numero_permis: "", categorie_permis: "", date_expiration_permis: "", statut: "actif" };

export default function Drivers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
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

  const driverStats = {};
  trips.forEach(t => {
    if (!driverStats[t.driver_id]) driverStats[t.driver_id] = { km: 0, missions: 0 };
    driverStats[t.driver_id].km += t.km_parcourus || 0;
    driverStats[t.driver_id].missions += 1;
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingDriver ? "Modifier le chauffeur" : "Nouveau chauffeur"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[["prenom","Prénom"],["nom","Nom"],["telephone","Téléphone"],["numero_permis","N° Permis"],["categorie_permis","Catégorie permis"]].map(([k, l]) => (
              <div key={k}><Label className="text-xs">{l}</Label><Input className="mt-1" value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
            <div>
              <Label className="text-xs">Expiration permis</Label>
              <Input type="date" className="mt-1" value={form.date_expiration_permis || ""} onChange={e => setForm({ ...form, date_expiration_permis: e.target.value })} />
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