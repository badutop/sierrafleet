import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Truck, RotateCw, AlertTriangle, CheckCircle, Fuel, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const zoneConsoVal = { zone1: 9, zone2: 25, zone3: 30, zone4: 40 };

export default function CampaignDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [rotationDialogOpen, setRotationDialogOpen] = useState(false);
  const [rotForm, setRotForm] = useState({ vehicle_id: "", driver_id: "", numero_bon_client: "", date_rotation: "", heure_depart_port: "", heure_arrivee_depot: "", poids_charge_tonnes: "", observations: "" });

  const { data: campaign } = useQuery({ queryKey: ["campaign", id], queryFn: () => base44.entities.Campaign.filter({ id }) .then(r => r[0]) });
  const { data: client } = useQuery({ queryKey: ["client", campaign?.client_id], queryFn: () => base44.entities.Client.filter({ id: campaign.client_id }).then(r => r[0]), enabled: !!campaign?.client_id });
  const { data: rotations = [] } = useQuery({ queryKey: ["rotations", id], queryFn: () => base44.entities.Rotation.filter({ campaign_id: id }, "-date_rotation") });
  const { data: declarations = [] } = useQuery({ queryKey: ["declarations", id], queryFn: () => base44.entities.DailyDeclaration.filter({ campaign_id: id }, "-date_declaration") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });

  const createRotation = useMutation({
    mutationFn: async (data) => {
      const nextNum = rotations.length + 1;
      const consoLitres = client ? zoneConsoVal[client.zone] || 9 : 9;
      const refuelDeclenche = nextNum % 3 === 0;
      const rotation = await base44.entities.Rotation.create({
        ...data,
        campaign_id: id,
        numero_rotation: nextNum,
        litres_carburant_alloues: consoLitres,
        refuel_declenche: refuelDeclenche,
        poids_charge_tonnes: Number(data.poids_charge_tonnes || 0),
        statut: "livree",
      });
      // Update campaign counters
      await base44.entities.Campaign.update(id, {
        nombre_rotations_realisees: (campaign?.nombre_rotations_realisees || 0) + 1,
        tonnage_realise: (campaign?.tonnage_realise || 0) + Number(data.poids_charge_tonnes || 0),
      });
      if (refuelDeclenche) {
        await base44.entities.FuelEntry.create({
          vehicle_id: data.vehicle_id,
          date: new Date().toISOString().split("T")[0],
          litres: consoLitres * 3,
          montant_total: consoLitres * 3 * 650,
          km_compteur: 0,
          station: `Refuel auto — Rotation ${nextNum} (Campagne)`,
        });
        toast.info(`Refuel automatique déclenché après 3 rotations (${consoLitres * 3} L enregistrés)`);
      }
      return rotation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations", id] });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      setRotationDialogOpen(false);
      setRotForm({ vehicle_id: "", driver_id: "", numero_bon_client: "", date_rotation: "", heure_depart_port: "", heure_arrivee_depot: "", poids_charge_tonnes: "", observations: "" });
      toast.success("Rotation enregistrée");
    },
  });

  const updateBonPhysique = useMutation({
    mutationFn: ({ rotId, received }) => base44.entities.Rotation.update(rotId, { bon_physique_recu: received }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rotations", id] }),
  });

  if (!campaign) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" /></div>;

  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, `${d.prenom} ${d.nom}`]));

  const bonsSysteme = rotations.length;
  const bonsPhysiques = rotations.filter(r => r.bon_physique_recu).length;
  const ecart = bonsSysteme - bonsPhysiques;
  const progress = campaign.tonnage_total_prevu > 0 ? Math.min(100, Math.round((campaign.tonnage_realise || 0) / campaign.tonnage_total_prevu * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/campaigns"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Retour</Button></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{campaign.nom_campagne}</h1>
          <p className="text-sm text-muted-foreground">{client?.nom || "—"} · {campaign.type_marchandise}</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => setRotationDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nouvelle rotation
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Rotations réalisées", value: campaign.nombre_rotations_realisees || 0, icon: RotateCw, color: "text-primary" },
          { label: "Tonnage livré (T)", value: (campaign.tonnage_realise || 0).toFixed(1), icon: Truck, color: "text-secondary" },
          { label: "Bons système", value: bonsSysteme, icon: ClipboardList, color: "text-blue-600" },
          { label: ecart > 0 ? `Écart bons (${ecart})` : "Bons physiques OK", value: bonsPhysiques, icon: ecart > 0 ? AlertTriangle : CheckCircle, color: ecart > 0 ? "text-destructive" : "text-emerald-600" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={cn("w-8 h-8 opacity-70", kpi.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Avancement global</span>
            <span className="font-semibold">{progress}% — {campaign.tonnage_realise || 0} / {campaign.tonnage_total_prevu || 0} T</span>
          </div>
          <div className="h-3 bg-muted rounded-full"><div className="h-3 bg-secondary rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
        </CardContent>
      </Card>

      {ecart > 0 && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">Écart détecté : {ecart} bon(s) manquant(s) — {bonsSysteme} dans le système vs {bonsPhysiques} bons physiques collectés.</p>
        </div>
      )}

      <Tabs defaultValue="rotations">
        <TabsList>
          <TabsTrigger value="rotations">Rotations ({rotations.length})</TabsTrigger>
          <TabsTrigger value="declarations">Déclarations journalières ({declarations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rotations" className="mt-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Camion</TableHead>
                  <TableHead>Chauffeur</TableHead>
                  <TableHead>Bon client</TableHead>
                  <TableHead className="text-right">Poids (T)</TableHead>
                  <TableHead className="text-right">Carburant (L)</TableHead>
                  <TableHead>Refuel</TableHead>
                  <TableHead>Bon physique</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rotations.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground"><RotateCw className="w-8 h-8 mx-auto mb-2 opacity-30" />Aucune rotation</TableCell></TableRow>
                ) : rotations.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">#{r.numero_rotation}</TableCell>
                    <TableCell className="text-sm">{r.date_rotation ? new Date(r.date_rotation).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell className="text-sm">{vehicleMap[r.vehicle_id]?.immatriculation || "—"}</TableCell>
                    <TableCell className="text-sm">{driverMap[r.driver_id] || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{r.numero_bon_client || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{r.poids_charge_tonnes || 0}</TableCell>
                    <TableCell className="text-right text-sm">{r.litres_carburant_alloues || 0}</TableCell>
                    <TableCell>{r.refuel_declenche && <Badge className="bg-amber-500/10 text-amber-600 text-[10px]"><Fuel className="w-3 h-3 mr-1" />Refuel</Badge>}</TableCell>
                    <TableCell>
                      <button onClick={() => updateBonPhysique.mutate({ rotId: r.id, received: !r.bon_physique_recu })}
                        className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors", r.bon_physique_recu ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-emerald-500")}>
                        {r.bon_physique_recu && <CheckCircle className="w-3 h-3 text-white" />}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="declarations" className="mt-4">
          <DailyDeclarations campaignId={id} vehicles={vehicles} drivers={drivers} campaign={campaign} />
        </TabsContent>
      </Tabs>

      {/* Rotation Dialog */}
      <Dialog open={rotationDialogOpen} onOpenChange={setRotationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Saisie d'une rotation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="text-xs">Camion *</Label>
              <Select value={rotForm.vehicle_id || "none"} onValueChange={v => setRotForm({ ...rotForm, vehicle_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent><SelectItem value="none">-- Sélectionner --</SelectItem>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Chauffeur *</Label>
              <Select value={rotForm.driver_id || "none"} onValueChange={v => setRotForm({ ...rotForm, driver_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent><SelectItem value="none">-- Sélectionner --</SelectItem>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">N° Bon client</Label><Input className="mt-1" placeholder="BON-001" value={rotForm.numero_bon_client} onChange={e => setRotForm({ ...rotForm, numero_bon_client: e.target.value })} /></div>
            <div><Label className="text-xs">Poids chargé (T)</Label><Input type="number" className="mt-1" value={rotForm.poids_charge_tonnes} onChange={e => setRotForm({ ...rotForm, poids_charge_tonnes: e.target.value })} /></div>
            <div><Label className="text-xs">Date/Heure départ</Label><Input type="datetime-local" className="mt-1" value={rotForm.date_rotation} onChange={e => setRotForm({ ...rotForm, date_rotation: e.target.value })} /></div>
            <div><Label className="text-xs">Heure arrivée dépôt</Label><Input type="time" className="mt-1" value={rotForm.heure_arrivee_depot} onChange={e => setRotForm({ ...rotForm, heure_arrivee_depot: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">Observations</Label><Input className="mt-1" value={rotForm.observations} onChange={e => setRotForm({ ...rotForm, observations: e.target.value })} /></div>
          </div>
          {(rotations.length + 1) % 3 === 0 && (
            <div className="mt-2 p-2 bg-amber-500/10 border border-amber-400/30 rounded text-xs text-amber-700 flex items-center gap-2">
              <Fuel className="w-4 h-4 shrink-0" />
              Cette rotation est la {rotations.length + 1}ème — un refuel sera automatiquement enregistré.
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setRotationDialogOpen(false)}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={() => createRotation.mutate(rotForm)} disabled={createRotation.isPending || !rotForm.vehicle_id || !rotForm.driver_id}>
              {createRotation.isPending ? "Enregistrement..." : "Valider la rotation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DailyDeclarations({ campaignId, vehicles, drivers, campaign }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", driver_id: "", date_declaration: new Date().toISOString().split("T")[0], bl_navire: campaign?.bl_navire || "", type_marchandise: campaign?.type_marchandise || "", nombre_rotations_jour: "", tonnage_total_jour: "", bons_systeme: "", bons_physiques: "", litres_carburant_consommes: "", observations: "" });
  const queryClient = useQueryClient();

  const { data: declarations = [] } = useQuery({ queryKey: ["declarations", campaignId], queryFn: () => base44.entities.DailyDeclaration.filter({ campaign_id: campaignId }, "-date_declaration") });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const ecart = Number(data.bons_systeme || 0) - Number(data.bons_physiques || 0);
      return base44.entities.DailyDeclaration.create({
        ...data,
        campaign_id: campaignId,
        nombre_rotations_jour: Number(data.nombre_rotations_jour || 0),
        tonnage_total_jour: Number(data.tonnage_total_jour || 0),
        bons_systeme: Number(data.bons_systeme || 0),
        bons_physiques: Number(data.bons_physiques || 0),
        litres_carburant_consommes: Number(data.litres_carburant_consommes || 0),
        ecart_bons: ecart,
        statut_validation: ecart !== 0 ? "ecart_detecte" : "soumis",
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["declarations", campaignId] }); setDialogOpen(false); toast.success("Déclaration enregistrée"); },
  });

  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, `${d.prenom} ${d.nom}`]));

  const statutColors = { brouillon: "bg-muted text-muted-foreground", soumis: "bg-blue-500/10 text-blue-600", valide: "bg-emerald-500/10 text-emerald-600", ecart_detecte: "bg-destructive/10 text-destructive" };
  const statutLabels = { brouillon: "Brouillon", soumis: "Soumis", valide: "Validé", ecart_detecte: "Écart détecté" };

  const ecartPreview = Number(form.bons_systeme || 0) - Number(form.bons_physiques || 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Déclaration journalière
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Camion</TableHead>
              <TableHead>BL Navire</TableHead>
              <TableHead className="text-right">Rotations</TableHead>
              <TableHead className="text-right">Tonnage (T)</TableHead>
              <TableHead className="text-right">Bons sys.</TableHead>
              <TableHead className="text-right">Bons phys.</TableHead>
              <TableHead className="text-right">Écart</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {declarations.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Aucune déclaration</TableCell></TableRow>
            ) : declarations.map(d => (
              <TableRow key={d.id}>
                <TableCell className="text-sm font-medium">{d.date_declaration}</TableCell>
                <TableCell className="text-sm">{vehicleMap[d.vehicle_id]?.immatriculation || "—"}</TableCell>
                <TableCell className="text-sm font-mono">{d.bl_navire || "—"}</TableCell>
                <TableCell className="text-right text-sm">{d.nombre_rotations_jour}</TableCell>
                <TableCell className="text-right text-sm font-semibold">{d.tonnage_total_jour}</TableCell>
                <TableCell className="text-right text-sm">{d.bons_systeme}</TableCell>
                <TableCell className="text-right text-sm">{d.bons_physiques}</TableCell>
                <TableCell className={cn("text-right text-sm font-semibold", d.ecart_bons !== 0 ? "text-destructive" : "text-emerald-600")}>{d.ecart_bons > 0 ? `+${d.ecart_bons}` : d.ecart_bons}</TableCell>
                <TableCell><Badge className={cn("text-[10px]", statutColors[d.statut_validation])}>{statutLabels[d.statut_validation]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Déclaration journalière</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div><Label className="text-xs">Date *</Label><Input type="date" className="mt-1" value={form.date_declaration} onChange={e => setForm({ ...form, date_declaration: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Camion *</Label>
              <Select value={form.vehicle_id || "none"} onValueChange={v => setForm({ ...form, vehicle_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent><SelectItem value="none">-- Sélectionner --</SelectItem>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">BL Navire</Label><Input className="mt-1" value={form.bl_navire} onChange={e => setForm({ ...form, bl_navire: e.target.value })} /></div>
            <div><Label className="text-xs">Type marchandise</Label><Input className="mt-1" value={form.type_marchandise} onChange={e => setForm({ ...form, type_marchandise: e.target.value })} /></div>
            <div><Label className="text-xs">Rotations du jour</Label><Input type="number" className="mt-1" value={form.nombre_rotations_jour} onChange={e => setForm({ ...form, nombre_rotations_jour: e.target.value })} /></div>
            <div><Label className="text-xs">Tonnage total (T)</Label><Input type="number" className="mt-1" value={form.tonnage_total_jour} onChange={e => setForm({ ...form, tonnage_total_jour: e.target.value })} /></div>
            <div><Label className="text-xs">Bons système</Label><Input type="number" className="mt-1" value={form.bons_systeme} onChange={e => setForm({ ...form, bons_systeme: e.target.value })} /></div>
            <div><Label className="text-xs">Bons physiques collectés</Label><Input type="number" className="mt-1" value={form.bons_physiques} onChange={e => setForm({ ...form, bons_physiques: e.target.value })} /></div>
            <div><Label className="text-xs">Carburant consommé (L)</Label><Input type="number" className="mt-1" value={form.litres_carburant_consommes} onChange={e => setForm({ ...form, litres_carburant_consommes: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">Observations</Label><Input className="mt-1" value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>
          </div>
          {(form.bons_systeme || form.bons_physiques) && (
            <div className={cn("mt-2 p-3 rounded-lg text-xs flex items-center gap-2", ecartPreview !== 0 ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-emerald-500/10 text-emerald-700 border border-emerald-400/20")}>
              {ecartPreview !== 0 ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
              {ecartPreview !== 0 ? `Écart détecté : ${Math.abs(ecartPreview)} bon(s) ${ecartPreview > 0 ? "manquant(s) physiquement" : "en surplus physique"}` : "Bons système et physiques concordent"}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.vehicle_id || !form.date_declaration}>
              {createMutation.isPending ? "Enregistrement..." : "Soumettre"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}