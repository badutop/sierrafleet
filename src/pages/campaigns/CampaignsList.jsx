import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Ship, Pencil, Trash2, ArrowRight, Package, CalendarDays, Rows3 } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import TruckAssignmentBoard from "@/components/campaigns/TruckAssignmentBoard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statutLabels = { creee: "Créée", validee_responsable: "Validée (Responsable)", validee_operationnel: "Validée (Opérationnel)", en_cours: "En cours", terminee: "Terminée", clôturee: "Clôturée" };
const statutColors = { creee: "bg-blue-500/10 text-blue-600", validee_responsable: "bg-purple-500/10 text-purple-600", validee_operationnel: "bg-cyan-500/10 text-cyan-600", en_cours: "bg-emerald-500/10 text-emerald-600", terminee: "bg-amber-500/10 text-amber-600", clôturee: "bg-muted text-muted-foreground" };
const cerealTypes = ["Blé", "Maïs", "Riz", "Orge", "Seigle", "Avoine", "Soja", "Tournesol", "Colza"];

const emptyForm = { nom_campagne: "", client_id: "", type_marchandise: "", point_origine: "", depot_destination_id: "", date_debut: "", date_fin_prevue: "", tonnage_total_prevu: "", nombre_rotations_prevues: "", statut: "creee", observations: "" };

export default function CampaignsList() {
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ["campaigns"], queryFn: () => base44.entities.Campaign.list("-date_debut") });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: depots = [] } = useQuery({ queryKey: ["depots"], queryFn: () => base44.entities.Depot.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); closeDialog(); toast.success("Campagne créée"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Campaign.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); closeDialog(); toast.success("Campagne modifiée"); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); toast.success("Campagne supprimée"); },
  });

  const openCreate = () => { setEditingCampaign(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c) => { setEditingCampaign(c); setForm({ ...emptyForm, ...c }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingCampaign(null); setForm(emptyForm); };

  const handleSave = () => {
    const data = { ...form, tonnage_total_prevu: Number(form.tonnage_total_prevu || 0), nombre_rotations_prevues: Number(form.nombre_rotations_prevues || 0) };
    if (editingCampaign) updateMutation.mutate({ id: editingCampaign.id, data });
    else createMutation.mutate(data);
  };

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const filtered = campaigns.filter(c => {
    const matchSearch = c.nom_campagne?.toLowerCase().includes(search.toLowerCase()) || c.reference?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "all" || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const [view, setView] = useState("list"); // "list" | "board"

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campagnes</h1>
          <p className="text-sm text-muted-foreground">{campaigns.filter(c => c.statut === "en_cours").length} en cours · {campaigns.length} total</p>
        </div>
        <div className="flex gap-2">
          <RouterLink to="/campaigns/calendar">
            <Button variant="outline" size="sm"><CalendarDays className="w-4 h-4 mr-2" /> Calendrier</Button>
          </RouterLink>
          <Button variant={view === "board" ? "default" : "outline"} size="sm" onClick={() => setView(v => v === "board" ? "list" : "board")}>
            <Rows3 className="w-4 h-4 mr-2" /> {view === "board" ? "Vue liste" : "Affecter camions"}
          </Button>
          <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle campagne
          </Button>
        </div>
      </div>

      {view === "board" && (
        <TruckAssignmentBoard campaigns={filtered} />
      )}

      <div className={cn("flex flex-col sm:flex-row gap-3", view === "board" && "hidden")}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(statutLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {view !== "board" && isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
      ) : view !== "board" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(c => {
            const client = clientMap[c.client_id];
            const progress = c.tonnage_total_prevu > 0 ? Math.min(100, Math.round((c.tonnage_realise || 0) / c.tonnage_total_prevu * 100)) : 0;
            const rotProgress = c.nombre_rotations_prevues > 0 ? Math.min(100, Math.round((c.nombre_rotations_realisees || 0) / c.nombre_rotations_prevues * 100)) : 0;
            return (
              <Card key={c.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Ship className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{c.nom_campagne}</CardTitle>
                        <p className="text-xs text-muted-foreground">{c.reference && `Réf: ${c.reference} · `}{client?.nom || "—"}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-[10px] shrink-0", statutColors[c.statut])}>{statutLabels[c.statut]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-muted-foreground">Tonnage</span><span className="font-medium">{c.tonnage_realise || 0} / {c.tonnage_total_prevu || 0} T</span></div>
                      <div className="h-1.5 bg-muted rounded-full"><div className="h-1.5 bg-secondary rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-muted-foreground">Rotations</span><span className="font-medium">{c.nombre_rotations_realisees || 0} / {c.nombre_rotations_prevues || 0}</span></div>
                      <div className="h-1.5 bg-muted rounded-full"><div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${rotProgress}%` }} /></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" />{c.type_marchandise}</span>
                    <span>{c.date_debut} → {c.date_fin_prevue || "—"}</span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-border">
                    <Link to={`/campaigns/${c.id}`} className="flex-1">
                      <Button size="sm" variant="default" className="w-full h-7 text-xs bg-primary hover:bg-primary/90">
                        <ArrowRight className="w-3 h-3 mr-1" /> Gérer
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("Supprimer cette campagne ?")) deleteMutation.mutate(c.id); }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-16 text-muted-foreground">
              <Ship className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune campagne trouvée</p>
            </div>
          )}
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCampaign ? "Modifier la campagne" : "Nouvelle campagne"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2">
              <Label className="text-xs">Nom de la campagne *</Label>
              <Input className="mt-1" value={form.nom_campagne} onChange={e => setForm({ ...form, nom_campagne: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Client *</Label>
              <Select value={form.client_id || "none"} onValueChange={v => setForm({ ...form, client_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Sélectionner --</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Navire *</Label>
              <Input className="mt-1" value={form.navire || ""} onChange={e => setForm({ ...form, navire: e.target.value })} placeholder="Nom du navire" />
            </div>
            <div>
              <Label className="text-xs">Type de marchandise *</Label>
              <Select value={form.type_marchandise || "none"} onValueChange={v => setForm({ ...form, type_marchandise: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Sélectionner --</SelectItem>
                  {cerealTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Point de départ (dépôt) *</Label>
              <Select value={form.point_origine || "none"} onValueChange={v => setForm({ ...form, point_origine: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Sélectionner un dépôt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Sélectionner --</SelectItem>
                  {depots.filter(d => d.client_id === form.client_id).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.nom_depot} — {d.zone}</SelectItem>
                  ))}
                  {(!form.client_id || depots.filter(d => d.client_id === form.client_id).length === 0) && (
                    <SelectItem disabled value="no-depots">Sélectionnez d'abord un client</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Dépôt destination *</Label>
              <Select value={form.depot_destination_id || "none"} onValueChange={v => setForm({ ...form, depot_destination_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Sélectionner un dépôt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Sélectionner --</SelectItem>
                  {depots.filter(d => d.client_id === form.client_id).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.nom_depot} — {d.zone}</SelectItem>
                  ))}
                  {(!form.client_id || depots.filter(d => d.client_id === form.client_id).length === 0) && (
                    <SelectItem disabled value="no-depots">Sélectionnez d'abord un client</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Tonnage prévu (T)</Label><Input type="number" className="mt-1" value={form.tonnage_total_prevu} onChange={e => setForm({ ...form, tonnage_total_prevu: e.target.value })} /></div>
            <div><Label className="text-xs">Rotations prévues</Label><Input type="number" className="mt-1" value={form.nombre_rotations_prevues} onChange={e => setForm({ ...form, nombre_rotations_prevues: e.target.value })} /></div>
            <div><Label className="text-xs">Date début</Label><Input type="date" className="mt-1" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} /></div>
            <div><Label className="text-xs">Date fin prévue</Label><Input type="date" className="mt-1" value={form.date_fin_prevue} onChange={e => setForm({ ...form, date_fin_prevue: e.target.value })} /></div>
            <div className="col-span-2">
              <Label className="text-xs">Statut</Label>
              <Select value={form.statut} onValueChange={v => setForm({ ...form, statut: v })} disabled={!editingCampaign}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statutLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs">Observations</Label><Input className="mt-1" value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={closeDialog}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleSave} disabled={isPending || !form.nom_campagne || !form.client_id || !form.type_marchandise || !form.point_origine || !form.depot_destination_id}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}