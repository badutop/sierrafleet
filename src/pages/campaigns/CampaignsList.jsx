import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Ship, Pencil, Trash2, ArrowRight, Package, CalendarDays, Rows3, Archive } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import TruckAssignmentBoard from "@/components/campaigns/TruckAssignmentBoard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";
import { stampStatutDate } from "@/lib/campaignStatus";
import { PORT_MOLES as portMoles } from "@/lib/campaignLocations";

const statutLabels = { creee: "Créée", validee_responsable: "Validée (Responsable)", validee_operationnel: "Validée (Opérationnel)", en_cours: "En cours", terminee: "Terminée", clôturée: "Clôturée" };
const statutColors = { creee: "bg-blue-500/10 text-blue-600", validee_responsable: "bg-purple-500/10 text-purple-600", validee_operationnel: "bg-cyan-500/10 text-cyan-600", en_cours: "bg-emerald-500/10 text-emerald-600", terminee: "bg-amber-500/10 text-amber-600", clôturée: "bg-muted text-muted-foreground" };
const cerealTypes = ["Blé", "Maïs", "Riz", "Orge", "Seigle", "Avoine", "Soja", "Tournesol", "Colza"];

// Moyenne de tonnage transporté par rotation de camion — sert de base au
// calcul automatique du nombre de rotations prévues. (Sujet à variations
// selon le type de camion, à affiner plus tard.)
const TONNAGE_PAR_ROTATION = 31;
// Nombre de rotations qu'un camion peut faire par jour — sert au calcul
// automatique du nombre de camions nécessaires.
const ROTATIONS_PAR_CAMION_JOUR = 3;

const emptyForm = { nom_campagne: "", clients: [{ client_id: "", tonnage_prevu: "" }], navire: "", type_marchandise: "", point_origine: "", depot_destination_id: "", date_debut: "", date_fin_prevue: "", duree_prevue_jours: "", tonnage_total_prevu: 0, nombre_rotations_prevues: "", nombre_camions: "", statut: "creee", observations: "" };

export default function CampaignsList() {
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("date_debut", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: depots = [] } = useQuery({
    queryKey: ["depots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("depots").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: campaignClients = [] } = useQuery({
    queryKey: ["campaign_clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_clients").select("*");
      if (error) throw error;
      return data;
    },
  });

  const saveCampaignClients = async (campaignId, clientRows) => {
    const { error: delError } = await supabase.from("campaign_clients").delete().eq("campaign_id", campaignId);
    if (delError) throw delError;
    const rows = clientRows
      .filter(r => r.client_id && r.tonnage_prevu)
      .map(r => ({ id: crypto.randomUUID(), campaign_id: campaignId, client_id: r.client_id, tonnage_prevu: Number(r.tonnage_prevu) }));
    if (rows.length) {
      const { error: insError } = await supabase.from("campaign_clients").insert(rows);
      if (insError) throw insError;
    }
  };

  const createMutation = useMutation({
    mutationFn: async ({ clients: clientRows, ...data }) => {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("campaigns").insert({ id, ...data });
      if (error) throw error;
      await saveCampaignClients(id, clientRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign_clients"] });
      closeDialog(); toast.success("Campagne créée");
    },
    onError: (err) => toast.error(`Erreur lors de la création : ${err.message}`),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: { clients: clientRows, ...data } }) => {
      const { error } = await supabase.from("campaigns").update(data).eq("id", id);
      if (error) throw error;
      await saveCampaignClients(id, clientRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign_clients"] });
      closeDialog(); toast.success("Campagne modifiée");
    },
    onError: (err) => toast.error(`Erreur lors de la modification : ${err.message}`),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); toast.success("Campagne supprimée"); },
  });

  const openCreate = () => { setEditingCampaign(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c) => {
    setEditingCampaign(c);
    const existingClients = campaignClients.filter(cc => cc.campaign_id === c.id);
    // Redéduit la durée (jours) depuis les dates déjà enregistrées, pour pouvoir la modifier.
    let dureeExistante = "";
    if (c.date_debut && c.date_fin_prevue) {
      const jours = Math.round((new Date(c.date_fin_prevue) - new Date(c.date_debut)) / 86400000) + 1;
      dureeExistante = String(Math.max(1, jours));
    }
    setForm({
      ...emptyForm,
      ...c,
      duree_prevue_jours: dureeExistante,
      clients: existingClients.length
        ? existingClients.map(cc => ({ client_id: cc.client_id, tonnage_prevu: String(cc.tonnage_prevu) }))
        : (c.client_id ? [{ client_id: c.client_id, tonnage_prevu: String(c.tonnage_total_prevu || "") }] : [{ client_id: "", tonnage_prevu: "" }]),
    });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingCampaign(null); setForm(emptyForm); };

  // Total tonnage = somme des tonnages saisis par client.
  const totalTonnage = (form.clients || []).reduce((sum, r) => sum + (parseFloat(r.tonnage_prevu) || 0), 0);
  const selectedClientIds = (form.clients || []).map(r => r.client_id).filter(Boolean);

  // Rotations prévues = tonnage total / tonnage moyen par rotation (31T).
  const rotationsPrevues = totalTonnage > 0 ? Math.ceil(totalTonnage / TONNAGE_PAR_ROTATION) : 0;
  const dureeJours = parseInt(form.duree_prevue_jours) || 0;

  // Camions nécessaires = rotations prévues / (durée × 3 rotations/jour/camion).
  const camionsNecessaires = rotationsPrevues > 0 && dureeJours > 0 ? Math.ceil(rotationsPrevues / (dureeJours * ROTATIONS_PAR_CAMION_JOUR)) : 0;

  // Recalcule rotations/camions/date de fin à chaque changement pertinent (tonnage par client, durée, date début).
  const recalc = (nextForm) => {
    const total = (nextForm.clients || []).reduce((sum, r) => sum + (parseFloat(r.tonnage_prevu) || 0), 0);
    const rotations = total > 0 ? Math.ceil(total / TONNAGE_PAR_ROTATION) : 0;
    const duree = parseInt(nextForm.duree_prevue_jours) || 0;
    const camions = rotations > 0 && duree > 0 ? Math.ceil(rotations / (duree * ROTATIONS_PAR_CAMION_JOUR)) : 0;
    let dateFin = "";
    if (duree > 0 && nextForm.date_debut) {
      const debut = new Date(nextForm.date_debut);
      debut.setDate(debut.getDate() + (duree - 1));
      dateFin = debut.toISOString().split("T")[0];
    }
    return { ...nextForm, tonnage_total_prevu: total, nombre_rotations_prevues: rotations, nombre_camions: camions, date_fin_prevue: dateFin };
  };

  const updateClientRow = (index, field, value) => {
    setForm(prev => {
      const clients = prev.clients.map((r, i) => i === index ? { ...r, [field]: value } : r);
      return recalc({ ...prev, clients });
    });
  };
  const addClientRow = () => setForm(prev => ({ ...prev, clients: [...prev.clients, { client_id: "", tonnage_prevu: "" }] }));
  const removeClientRow = (index) => setForm(prev => recalc({ ...prev, clients: prev.clients.filter((_, i) => i !== index) }));

  const handleSave = () => {
    // Postgres rejette "" pour les colonnes date (l'ancien backend l'acceptait) — on convertit en null.
    // duree_prevue_jours ne correspond à aucune colonne (juste utile au calcul), on l'exclut de l'envoi.
    const { clients: clientRows, duree_prevue_jours, ...rest } = form;
    const validClients = clientRows.filter(r => r.client_id && r.tonnage_prevu);
    const data = {
      ...rest,
      client_id: validClients[0]?.client_id || "",
      tonnage_total_prevu: totalTonnage,
      nombre_rotations_prevues: rotationsPrevues,
      nombre_camions: camionsNecessaires,
      clients: validClients,
    };
    if (data.date_debut === "") data.date_debut = null;
    if (data.date_fin_prevue === "") data.date_fin_prevue = null;
    if (editingCampaign) {
      Object.assign(data, stampStatutDate(editingCampaign, data.statut));
      updateMutation.mutate({ id: editingCampaign.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = async (c) => {
    if (c.statut !== "creee") {
      toast.error("Une campagne déjà ouverte ne peut plus être supprimée — clôturez-la puis archivez-la.");
      return;
    }
    if (await confirm("Supprimer cette campagne ?")) deleteMutation.mutate(c.id);
  };

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  // Une campagne archivée (clôturée) sort de la liste principale — elle n'est
  // consultable que via la vue "Archivées", plus modifiable ni supprimable.
  const activeCampaigns = campaigns.filter(c => c.statut !== "clôturée");
  const archivedCampaigns = campaigns.filter(c => c.statut === "clôturée");

  const filtered = activeCampaigns.filter(c => {
    const matchSearch = c.nom_campagne?.toLowerCase().includes(search.toLowerCase()) || c.reference?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "all" || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });
  const filteredArchived = archivedCampaigns.filter(c =>
    c.nom_campagne?.toLowerCase().includes(search.toLowerCase()) || c.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const [view, setView] = useState("list"); // "list" | "board" | "archived"

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campagnes</h1>
          <p className="text-sm text-muted-foreground">{campaigns.filter(c => c.statut === "en_cours").length} en cours · {activeCampaigns.length} active{activeCampaigns.length > 1 ? "s" : ""} · {archivedCampaigns.length} archivée{archivedCampaigns.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <RouterLink to="/campaigns/calendar">
            <Button variant="outline" size="sm"><CalendarDays className="w-4 h-4 mr-2" /> Calendrier</Button>
          </RouterLink>
          <Button variant={view === "archived" ? "default" : "outline"} size="sm" onClick={() => setView(v => v === "archived" ? "list" : "archived")}>
            <Archive className="w-4 h-4 mr-2" /> {view === "archived" ? "Vue liste" : `Archivées (${archivedCampaigns.length})`}
          </Button>
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
        {view !== "archived" && (
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(statutLabels).filter(([k]) => k !== "clôturée").map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {view !== "board" && isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>
      ) : view !== "board" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(view === "archived" ? filteredArchived : filtered).map(c => {
            const campaignClientNames = campaignClients
              .filter(cc => cc.campaign_id === c.id)
              .map(cc => clientMap[cc.client_id]?.nom)
              .filter(Boolean);
            const clientsLabel = campaignClientNames.length ? campaignClientNames.join(", ") : (clientMap[c.client_id]?.nom || "—");
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
                        <p className="text-xs text-muted-foreground">{c.reference && `Réf: ${c.reference} · `}{clientsLabel}</p>
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
                        <ArrowRight className="w-3 h-3 mr-1" /> {view === "archived" ? "Consulter" : "Gérer"}
                      </Button>
                    </Link>
                    {view !== "archived" && (<>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c)}><Trash2 className="w-3 h-3" /></Button>
                    </>)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(view === "archived" ? filteredArchived : filtered).length === 0 && (
            <div className="col-span-2 text-center py-16 text-muted-foreground">
              <Ship className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{view === "archived" ? "Aucune campagne archivée" : "Aucune campagne trouvée"}</p>
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
            <div className="col-span-2">
              <Label className="text-xs">Clients * <span className="text-muted-foreground font-normal">(un bateau peut être partagé par plusieurs clients)</span></Label>
              <div className="space-y-2 mt-1">
                {form.clients.map((row, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Select value={row.client_id || "none"} onValueChange={v => updateClientRow(i, "client_id", v === "none" ? "" : v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Sélectionner --</SelectItem>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" placeholder="Tonnage (T)" className="w-32"
                      value={row.tonnage_prevu}
                      onChange={e => updateClientRow(i, "tonnage_prevu", e.target.value)}
                    />
                    <Button
                      type="button" size="sm" variant="outline" className="h-9 px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => removeClientRow(i)} disabled={form.clients.length === 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={addClientRow}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un client
              </Button>
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
              <Label className="text-xs">Point de départ *</Label>
              <Select value={form.point_origine || "none"} onValueChange={v => setForm({ ...form, point_origine: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Sélectionner --</SelectItem>
                  {/* Dépôts du client */}
                  {depots.filter(d => selectedClientIds.includes(d.client_id)).length > 0 && (
                    <>
                      <SelectItem disabled value="depots-label">Dépôts du client</SelectItem>
                      {depots.filter(d => selectedClientIds.includes(d.client_id)).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.nom_depot} — {d.zone}</SelectItem>
                      ))}
                    </>
                  )}
                  {/* Môles du Port de Dakar */}
                  <SelectItem disabled value="moles-label">Môles du Port de Dakar</SelectItem>
                  {portMoles.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Destination *</Label>
              <Select value={form.depot_destination_id || "none"} onValueChange={v => setForm({ ...form, depot_destination_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Sélectionner --</SelectItem>
                  {/* Dépôts du client */}
                  {depots.filter(d => selectedClientIds.includes(d.client_id)).length > 0 && (
                    <>
                      <SelectItem disabled value="depots-label">Dépôts du client</SelectItem>
                      {depots.filter(d => selectedClientIds.includes(d.client_id)).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.nom_depot} — {d.zone}</SelectItem>
                      ))}
                    </>
                  )}
                  {/* Môles du Port de Dakar */}
                  <SelectItem disabled value="moles-label">Môles du Port de Dakar</SelectItem>
                  {portMoles.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date début</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.date_debut}
                onChange={e => setForm(prev => recalc({ ...prev, date_debut: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Durée prévue (jours) *</Label>
              <Input
                type="number"
                className="mt-1"
                value={form.duree_prevue_jours}
                onChange={e => setForm(prev => recalc({ ...prev, duree_prevue_jours: e.target.value }))}
              />
            </div>
            <div className="col-span-2 rounded-xl border-2 border-secondary bg-secondary/10 p-3">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Prévisions (calculées automatiquement)</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Tonnage total</span><span className="font-semibold">{totalTonnage || 0} T</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rotations prévues</span><span className="font-semibold">{rotationsPrevues}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Camions nécessaires</span><span className="font-semibold">{camionsNecessaires || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date fin prévue</span><span className="font-semibold">{form.date_fin_prevue || "—"}</span></div>
              </div>
              {dureeJours === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Renseignez le tonnage par client et la durée prévue pour calculer le nombre de camions nécessaires.</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                Base : {TONNAGE_PAR_ROTATION}T/rotation, {ROTATIONS_PAR_CAMION_JOUR} rotations/jour/camion.
              </p>
            </div>

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
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={handleSave} disabled={isPending || !form.nom_campagne || !selectedClientIds.length || !totalTonnage || !form.type_marchandise || !form.point_origine || !form.depot_destination_id}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}