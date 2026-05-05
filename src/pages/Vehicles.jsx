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
import { Plus, Search, Truck, Gauge, Calendar, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusLabels = { disponible: "Disponible", en_mission: "En mission", en_maintenance: "Maintenance", hors_service: "Hors service" };
const statusColors = { disponible: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", en_mission: "bg-blue-500/10 text-blue-600 border-blue-500/20", en_maintenance: "bg-amber-500/10 text-amber-600 border-amber-500/20", hors_service: "bg-destructive/10 text-destructive border-destructive/20" };
const typeLabels = { camion: "Camion", utilitaire: "Utilitaire", liaison: "Liaison", remorque: "Remorque" };

const emptyForm = { immatriculation: "", marque: "", modele: "", annee: "", couleur: "", km_actuel: "", type_vehicule: "camion", capacite_charge_tonnes: "", consommation_moyenne: "", date_assurance: "", date_visite_technique: "", date_vignette: "" };

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicles"] }); closeDialog(); toast.success("Véhicule ajouté"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicles"] }); closeDialog(); toast.success("Véhicule modifié"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Véhicule supprimé"); },
  });

  const openCreate = () => { setEditingVehicle(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (v) => { setEditingVehicle(v); setForm({ ...emptyForm, ...v }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingVehicle(null); setForm(emptyForm); };

  const handleSave = () => {
    const numFields = ["annee", "km_actuel", "capacite_charge_tonnes", "consommation_moyenne"];
    const data = { ...form };
    numFields.forEach(f => { if (data[f] !== "" && data[f] !== undefined) data[f] = Number(data[f]); });
    if (editingVehicle) updateMutation.mutate({ id: editingVehicle.id, data });
    else createMutation.mutate(data);
  };

  const handleDelete = (v) => {
    if (confirm(`Supprimer le véhicule ${v.immatriculation} ?`)) deleteMutation.mutate(v.id);
  };

  const filtered = vehicles.filter(v => {
    const matchSearch = v.immatriculation?.toLowerCase().includes(search.toLowerCase()) || v.marque?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || v.statut === filterStatus;
    const matchType = filterType === "all" || v.type_vehicule === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parc Véhicules</h1>
          <p className="text-sm text-muted-foreground">{vehicles.length} véhicules enregistrés</p>
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(v => (
            <Card key={v.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{v.immatriculation}</CardTitle>
                      <p className="text-xs text-muted-foreground">{v.marque} {v.modele}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px]", statusColors[v.statut])}>{statusLabels[v.statut]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Gauge className="w-3 h-3" /> Kilométrage</span><span className="font-medium">{(v.km_actuel || 0).toLocaleString("fr-FR")} km</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{typeLabels[v.type_vehicule] || v.type_vehicule}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Charge</span><span className="font-medium">{v.capacite_charge_tonnes || "-"} T</span></div>
                {v.date_assurance && <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Assurance</span><span className="font-medium">{v.date_assurance}</span></div>}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(v)}>
                    <Pencil className="w-3 h-3 mr-1" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(v)} disabled={deleteMutation.isPending}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingVehicle ? "Modifier le véhicule" : "Nouveau véhicule"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[["immatriculation","Immatriculation"],["marque","Marque"],["modele","Modèle"],["annee","Année"],["couleur","Couleur"],["km_actuel","Km actuel"],["consommation_moyenne","Conso moy. (L/100)"],["capacite_charge_tonnes","Capacité (tonnes)"]].map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input className="mt-1" value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type_vehicule || "camion"} onValueChange={v => setForm({ ...form, type_vehicule: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={form.statut || "disponible"} onValueChange={v => setForm({ ...form, statut: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date assurance</Label>
              <Input type="date" className="mt-1" value={form.date_assurance || ""} onChange={e => setForm({ ...form, date_assurance: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Visite technique</Label>
              <Input type="date" className="mt-1" value={form.date_visite_technique || ""} onChange={e => setForm({ ...form, date_visite_technique: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Vignette</Label>
              <Input type="date" className="mt-1" value={form.date_vignette || ""} onChange={e => setForm({ ...form, date_vignette: e.target.value })} />
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