import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fuel, TrendingUp, AlertTriangle, Truck, BarChart2, Plus } from "lucide-react";
import { toast } from "sonner";
import FuelSupplyDialog from "@/components/fuel/FuelSupplyDialog";
import FuelSupplyTable from "@/components/fuel/FuelSupplyTable";
import FuelConsumptionAnalysis from "@/components/fuel/FuelConsumptionAnalysis";
import FuelCostBreakdown from "@/components/fuel/FuelCostBreakdown";
import FuelAlertPanel from "@/components/fuel/FuelAlertPanel";

const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

export default function FuelManagementV2() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [activeTab, setActiveTab] = useState("approvisionnements");
  const queryClient = useQueryClient();

  // Données
  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["fuel"],
    queryFn: () => base44.entities.FuelEntry.list("-date", 500),
  });
  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations"],
    queryFn: () => base44.entities.Rotation.list("-date_rotation", 1000),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list(),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const montant = data._montant || (data.litres || 0) * (data.prix_litre || 0);
      const { _montant, expense_id, ...fuelData } = data;

      // Champs spécifiques FuelEntry
      const fuelPayload = {
        vehicle_id: fuelData.vehicle_id,
        date: fuelData.date,
        station: fuelData.station,
        litres: fuelData.litres,
        prix_litre: fuelData.prix_litre,
        km_compteur: fuelData.km_compteur,
        montant_total: montant,
      };

      // Champs pour Expense
      const expensePayload = {
        vehicle_id: fuelData.vehicle_id,
        driver_id: fuelData.driver_id || "",
        type_frais: "carburant",
        date_frais: fuelData.date,
        montant,
        description: fuelData.description || (fuelData.station ? `Carburant — ${fuelData.station}` : "Carburant"),
        collecteur: fuelData.collecteur || "",
        executeur: fuelData.executeur || "",
        statut: "en_attente",
      };

      let savedFuel;
      if (fuelData.id) {
        savedFuel = await base44.entities.FuelEntry.update(fuelData.id, fuelPayload);
        if (expense_id) {
          await base44.entities.Expense.update(expense_id, { ...expensePayload, statut: "en_attente" });
        } else {
          const newExpense = await base44.entities.Expense.create(expensePayload);
          await base44.entities.FuelEntry.update(fuelData.id, { expense_id: newExpense.id });
        }
      } else {
        savedFuel = await base44.entities.FuelEntry.create(fuelPayload);
        const newExpense = await base44.entities.Expense.create(expensePayload);
        await base44.entities.FuelEntry.update(savedFuel.id, { expense_id: newExpense.id });
      }

      return savedFuel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDialogOpen(false);
      setEditEntry(null);
      toast.success("Approvisionnement enregistré et frais créé");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FuelEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel"] });
      toast.success("Enregistrement supprimé");
    },
  });

  // Calculs
  const vMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);
  const campaignMap = useMemo(() => Object.fromEntries(campaigns.map(c => [c.id, c])), [campaigns]);
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  // Analyse de consommation
  const consumptionData = useMemo(() => {
    return vehicles.map(vehicle => {
      const vehicleRotations = rotations.filter(r => r.vehicle_id === vehicle.id);
      const fuelEntries = entries.filter(e => e.vehicle_id === vehicle.id);
      
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
  }, [vehicles, rotations, entries]);

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
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" /> Nouvel approvisionnement
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Carburant théorique (L)</p>
            <p className="text-2xl font-bold mt-1">{Math.round(kpiData.totalTheorique)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Carburant réel (L)</p>
            <p className="text-2xl font-bold mt-1">{Math.round(kpiData.totalReel)}</p>
            <p className={`text-xs mt-1 ${kpiData.ecartGlobalPct > 5 ? "text-destructive" : "text-emerald-600"}`}>
              {kpiData.ecartGlobalPct > 0 ? "+" : ""}{kpiData.ecartGlobalPct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Coût total</p>
            <p className="text-lg font-bold mt-1">{formatCFA(kpiData.totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Consommation L/100</p>
            <p className="text-2xl font-bold mt-1">{kpiData.consommationMoyenne.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Coût/km</p>
            <p className="text-lg font-bold mt-1">{formatCFA(kpiData.coutParKmGlobal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {kpiData.alertCount > 0 && (
        <FuelAlertPanel consumptionData={consumptionData} />
      )}

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
        </TabsList>

        <TabsContent value="approvisionnements" className="mt-4">
          <FuelSupplyTable
            entries={entries}
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
      </Tabs>

      {/* Dialog */}
      <FuelSupplyDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditEntry(null); }}
        vehicles={vehicles}
        drivers={drivers}
        entry={editEntry}
        onSave={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
    </div>
  );
}