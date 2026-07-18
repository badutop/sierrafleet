import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fuel, TrendingUp, AlertTriangle, Truck, BarChart2, Plus, ShieldCheck, Zap } from "lucide-react";
import AutoRefuelFlow from "@/components/fuel/auto/AutoRefuelFlow";
import { toast } from "sonner";
import FuelSupplyDialog from "@/components/fuel/FuelSupplyDialog";
import FuelSupplyTable from "@/components/fuel/FuelSupplyTable";
import FuelConsumptionAnalysis from "@/components/fuel/FuelConsumptionAnalysis";
import FuelCostBreakdown from "@/components/fuel/FuelCostBreakdown";
import FuelValidationTab from "@/components/fuel/FuelValidationTab";
import FuelMonthlyChart from "@/components/fuel/FuelMonthlyChart";
import { startOfMonth, startOfYear, subMonths } from "date-fns";

const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

const PERIODS = [
  { key: "mois_courant", label: "Mois en cours" },
  { key: "mois_dernier", label: "Mois dernier" },
  { key: "annee", label: "Cette année" },
  { key: "tout", label: "Tout" },
];

function getPeriodRange(key) {
  const now = new Date();
  if (key === "mois_courant") return { from: startOfMonth(now), to: now };
  if (key === "mois_dernier") {
    const start = startOfMonth(subMonths(now, 1));
    const end = startOfMonth(now);
    return { from: start, to: end };
  }
  if (key === "annee") return { from: startOfYear(now), to: now };
  return null;
}

export default function FuelManagementV2() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [activeTab, setActiveTab] = useState("approvisionnements");
  const [period, setPeriod] = useState("mois_courant");
  const [autoRefuelOpen, setAutoRefuelOpen] = useState(false);
  const queryClient = useQueryClient();

  // Données
  const { data: allEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["fuel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fuel_entries").select("*").order("date", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  const { data: allRotations = [] } = useQuery({
    queryKey: ["rotations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotations").select("*").order("date_rotation", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const { data: allVehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Ne montrer que les enregistrements liés à la (aux) campagne(s) en cours :
  // camions actuellement affectés (vehicles.campaign_id) à une campagne
  // "en_cours", et les rotations/entrées carburant de ces seuls camions.
  const ongoingCampaignIds = useMemo(() => new Set(campaigns.filter(c => c.statut === "en_cours").map(c => c.id)), [campaigns]);
  const vehicles = useMemo(() => allVehicles.filter(v => v.campaign_id && ongoingCampaignIds.has(v.campaign_id)), [allVehicles, ongoingCampaignIds]);
  const vehicleIds = useMemo(() => new Set(vehicles.map(v => v.id)), [vehicles]);
  const rotations = useMemo(() => allRotations.filter(r => ongoingCampaignIds.has(r.campaign_id)), [allRotations, ongoingCampaignIds]);
  const entries = useMemo(() => allEntries.filter(e => vehicleIds.has(e.vehicle_id)), [allEntries, vehicleIds]);
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*");
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const montant = data._montant || (data.litres || 0) * (data.prix_litre || 0);
      const { _montant, ...fuelData } = data;
      const payload = {
        vehicle_id: fuelData.vehicle_id,
        date: fuelData.date,
        station: fuelData.station,
        litres: Number(fuelData.litres),
        prix_litre: fuelData.prix_litre ? Number(fuelData.prix_litre) : null,
        km_compteur: fuelData.km_compteur ? Number(fuelData.km_compteur) : null,
        montant_total: montant,
        statut: "en_attente",
      };
      if (fuelData.id) {
        const { error } = await supabase.from("fuel_entries").update(payload).eq("id", fuelData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fuel_entries").insert({ id: crypto.randomUUID(), ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel"] });
      setDialogOpen(false);
      setEditEntry(null);
      toast.success("Approvisionnement enregistré");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("fuel_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel"] });
      toast.success("Enregistrement supprimé");
    },
  });

  // Filtre de période
  const filteredEntries = useMemo(() => {
    const range = getPeriodRange(period);
    if (!range) return entries;
    return entries.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= range.from && d <= range.to;
    });
  }, [entries, period]);

  // Calculs
  const vMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);
  const campaignMap = useMemo(() => Object.fromEntries(campaigns.map(c => [c.id, c])), [campaigns]);
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  // Analyse de consommation (sur la période filtrée)
  const consumptionData = useMemo(() => {
    return vehicles.map(vehicle => {
      const vehicleRotations = rotations.filter(r => r.vehicle_id === vehicle.id);
      const fuelEntries = filteredEntries.filter(e => e.vehicle_id === vehicle.id);
      
      // Théorique
      const theoriqueLitres = vehicleRotations.reduce((s, r) => s + (r.litres_carburant_alloues || 0), 0);
      
      // Réel
      const reelLitres = fuelEntries.reduce((s, e) => s + (e.litres || 0), 0);
      const reelCost = fuelEntries.reduce((s, e) => s + (e.montant_total || 0), 0);
      
      // Km parcourus
      const totalKm = vehicleRotations.reduce((s, r) => {
        const km_parcourus = (r.km_arrivee || 0) - (r.km_depart || 0);
        return s + (km_parcourus > 0 ? km_parcourus : 0);
      }, 0);
      
      // Consommation L/100km
      const consommation_l100 = totalKm > 0 ? (reelLitres / totalKm) * 100 : 0;
      
      // Coût par litre (prix moyen)
      const prixMoyenLitre = reelLitres > 0 ? reelCost / reelLitres : 0;
      
      // Coût par km
      const coutParKm = totalKm > 0 ? reelCost / totalKm : 0;
      
      // Écart
      const ecartLitres = reelLitres - theoriqueLitres;
      const ecartPct = theoriqueLitres > 0 ? (ecartLitres / theoriqueLitres) * 100 : 0;
      
      return {
        vehicle,
        rotationCount: vehicleRotations.length,
        theoriqueLitres,
        reelLitres,
        ecartLitres,
        ecartPct,
        reelCost,
        totalKm,
        consommation_l100,
        prixMoyenLitre,
        coutParKm,
      };
    }).filter(d => d.rotationCount > 0 || d.reelLitres > 0);
  }, [vehicles, rotations, filteredEntries]);

  // Analyse par rotation
  const rotationFuelData = useMemo(() => {
    return rotations
      .filter(r => r.statut === "livree" && r.litres_carburant_reel)
      .map(r => {
        const kmParcourus = (r.km_arrivee || 0) - (r.km_depart || 0);
        const prixMoyenLitre = entries
          .filter(e => e.vehicle_id === r.vehicle_id && e.date === (r.date_rotation?.split('T')[0]))
          .reduce((s, e) => s + (e.prix_litre || 0), 0) / entries.filter(e => e.vehicle_id === r.vehicle_id && e.date === (r.date_rotation?.split('T')[0])).length || 0;
        
        return {
          rotation: r,
          vehicle: vMap[r.vehicle_id],
          kmParcourus,
          litres: r.litres_carburant_reel,
          litrePrevus: r.litres_carburant_alloues,
          consommationL100: kmParcourus > 0 ? (r.litres_carburant_reel / kmParcourus) * 100 : 0,
          cout: (r.litres_carburant_reel || 0) * prixMoyenLitre,
          coutParKm: kmParcourus > 0 ? ((r.litres_carburant_reel || 0) * prixMoyenLitre) / kmParcourus : 0,
        };
      });
  }, [rotations, entries, vMap]);

  // KPIs
  const kpiData = useMemo(() => {
    const totalTheorique = consumptionData.reduce((s, d) => s + d.theoriqueLitres, 0);
    const totalReel = consumptionData.reduce((s, d) => s + d.reelLitres, 0);
    const totalCost = consumptionData.reduce((s, d) => s + d.reelCost, 0);
    const totalKm = consumptionData.reduce((s, d) => s + d.totalKm, 0);
    const ecartGlobal = totalReel - totalTheorique;
    const ecartGlobalPct = totalTheorique > 0 ? (ecartGlobal / totalTheorique) * 100 : 0;
    const consommationMoyenne = totalKm > 0 ? (totalReel / totalKm) * 100 : 0;
    const coutMoyenParLitre = totalReel > 0 ? totalCost / totalReel : 0;
    const coutParKmGlobal = totalKm > 0 ? totalCost / totalKm : 0;
    const alertCount = consumptionData.filter(d => Math.abs(d.ecartPct) > 15).length;

    return {
      totalTheorique,
      totalReel,
      totalCost,
      totalKm,
      ecartGlobal,
      ecartGlobalPct,
      consommationMoyenne,
      coutMoyenParLitre,
      coutParKmGlobal,
      alertCount,
    };
  }, [consumptionData]);

  const handleEdit = (entry) => { setEditEntry({ ...entry }); setDialogOpen(true); };
  const handleNew = () => { setEditEntry(null); setDialogOpen(true); };

  if (!loadingCampaigns && ongoingCampaignIds.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <Fuel className="w-12 h-12 text-muted-foreground opacity-30" />
        <h2 className="text-lg font-bold text-foreground">Aucune campagne en cours</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          La gestion du carburant n'affiche que les enregistrements des camions affectés à la campagne en cours. Démarrez une campagne pour voir apparaître ses données ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Fuel className="w-6 h-6 text-secondary" />
            Gestion du Carburant
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {entries.length} approvisionnements · {consumptionData.length} véhicules suivis
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" /> Nouvel approvisionnement
          </Button>
        </div>
      </div>

      {/* Filtre période */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Période :</span>
        {PERIODS.map(p => (
          <Button
            key={p.key}
            size="sm"
            variant={period === p.key ? "default" : "outline"}
            className="h-7 text-xs px-3"
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Litres approvisionnés</p>
            <p className="text-2xl font-bold mt-1">{Math.round(filteredEntries.reduce((s, e) => s + (e.litres || 0), 0))} L</p>
            <p className="text-xs text-muted-foreground mt-1">{filteredEntries.length} entrées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Coût total</p>
            <p className="text-xl font-bold mt-1">{formatCFA(filteredEntries.reduce((s, e) => s + (e.montant_total || 0), 0))}</p>
            <p className="text-xs text-muted-foreground mt-1">{PERIODS.find(p => p.key === period)?.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Consommation moy. L/100</p>
            <p className="text-2xl font-bold mt-1">{kpiData.consommationMoyenne.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">flotte globale</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">En attente de validation</p>
            <p className="text-2xl font-bold mt-1 text-amber-500">{entries.filter(e => !e.statut || e.statut === "en_attente").length}</p>
            <p className="text-xs text-muted-foreground mt-1">approvisionnements</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique mensuel (toujours sur toutes les données pour avoir la tendance) */}
      <FuelMonthlyChart entries={entries} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 flex-wrap h-auto gap-1">
          <TabsTrigger value="approvisionnements" className="flex items-center gap-1.5 text-xs">
            <Fuel className="w-3.5 h-3.5" /> Approvisionnements
          </TabsTrigger>
          <TabsTrigger value="consommation" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> Consommation
          </TabsTrigger>
          <TabsTrigger value="couts" className="flex items-center gap-1.5 text-xs">
            <BarChart2 className="w-3.5 h-3.5" /> Coûts
          </TabsTrigger>
          <TabsTrigger value="rotations" className="flex items-center gap-1.5 text-xs">
            <Truck className="w-3.5 h-3.5" /> Par rotation
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" /> Validation
            {entries.filter(e => !e.statut || e.statut === "en_attente").length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                {entries.filter(e => !e.statut || e.statut === "en_attente").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rechargement" className="flex items-center gap-1.5 text-xs">
            <Zap className="w-3.5 h-3.5" /> Rechargement Auto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvisionnements" className="mt-4">
          <FuelSupplyTable
            entries={[...entries].sort((a, b) => new Date(b.date || b.created_date) - new Date(a.date || a.created_date)).slice(0, 20)}
            isLoading={loadingEntries}
            vMap={vMap}
            campaignMap={campaignMap}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="consommation" className="mt-4">
          <FuelConsumptionAnalysis consumptionData={consumptionData} formatCFA={formatCFA} />
        </TabsContent>

        <TabsContent value="couts" className="mt-4">
          <FuelCostBreakdown consumptionData={consumptionData} rotationFuelData={rotationFuelData} formatCFA={formatCFA} />
        </TabsContent>

        <TabsContent value="rotations" className="mt-4">
          <div className="space-y-3">
            {rotationFuelData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucune rotation livrée avec consommation carburant</p>
            ) : (
              rotationFuelData.map(r => (
                <Card key={r.rotation.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Rotation</p>
                        <p className="font-semibold text-sm">{r.rotation.numero_rotation}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Véhicule</p>
                        <p className="font-mono text-sm">{r.vehicle?.immatriculation}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Km parcourus</p>
                        <p className="font-semibold text-sm">{Math.round(r.kmParcourus)} km</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Consommation</p>
                        <p className="font-semibold text-sm">{r.consommationL100.toFixed(1)} L/100</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Coût rotation</p>
                        <p className="font-bold text-secondary">{formatCFA(r.cout)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Coût/km</p>
                        <p className="font-semibold text-sm">{formatCFA(r.coutParKm)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="validation" className="mt-4">
          <FuelValidationTab
            entries={entries}
            vMap={vMap}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="rechargement" className="mt-4">
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                <Zap className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="font-bold text-base">Rechargement Automatique</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Lancez un rechargement carburant en scannant les bons et la pompe pour un chauffeur et un véhicule.
              </p>
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground mt-2" onClick={() => setAutoRefuelOpen(true)}>
                <Zap className="w-4 h-4 mr-2" /> Démarrer un rechargement
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Auto Refuel Flow */}
      {autoRefuelOpen && (
        <AutoRefuelFlow
          drivers={drivers}
          vehicles={vehicles}
          rotations={rotations}
          onClose={() => {
            setAutoRefuelOpen(false);
            queryClient.invalidateQueries({ queryKey: ["fuel"] });
            queryClient.invalidateQueries({ queryKey: ["rotations"] });
          }}
        />
      )}

      {/* Dialog */}
      <FuelSupplyDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditEntry(null); }}
        vehicles={vehicles}
        entry={editEntry}
        onSave={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
    </div>
  );
}