import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fuel, TrendingUp, AlertTriangle, Truck, BarChart2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FuelKpiStrip from "@/components/fuel/FuelKpiStrip";
import FuelSupplyTable from "@/components/fuel/FuelSupplyTable";
import FuelVarianceTable from "@/components/fuel/FuelVarianceTable";
import FuelSupplyDialog from "@/components/fuel/FuelSupplyDialog";
import FuelCampaignTab from "@/components/fuel/FuelCampaignTab";
import FuelVehiclePerformance from "@/components/fuel/FuelVehiclePerformance";
import FuelAlertsTab from "@/components/fuel/FuelAlertsTab";

const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

export default function FuelSupplyPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [activeTab, setActiveTab] = useState("approvisionnements");
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["fuel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fuel_entries").select("*").order("date", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotations").select("*").order("date_rotation", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*");
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { id, _montant, ...rest } = data;
      const payload = {
        ...rest,
        litres: Number(rest.litres),
        prix_litre: rest.prix_litre !== "" && rest.prix_litre != null ? Number(rest.prix_litre) : null,
        km_compteur: rest.km_compteur !== "" && rest.km_compteur != null ? Number(rest.km_compteur) : null,
        montant_total: (data.litres || 0) * (data.prix_litre || 0),
      };
      if (id) {
        const { error } = await supabase.from("fuel_entries").update(payload).eq("id", id);
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
      toast.success("Enregistrement sauvegardé");
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

  const vMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);
  const campaignMap = useMemo(() => Object.fromEntries(campaigns.map(c => [c.id, c])), [campaigns]);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthEntries = entries.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const totalMontantMois = monthEntries.reduce((s, e) => s + (e.montant_total || 0), 0);
  const totalLitresMois = monthEntries.reduce((s, e) => s + (e.litres || 0), 0);
  const avgPrix = totalLitresMois > 0 ? totalMontantMois / totalLitresMois : 0;

  const autoRefuels = entries.filter(e => e.station?.startsWith("Refuel auto"));
  const manuelRefuels = entries.filter(e => !e.station?.startsWith("Refuel auto"));

  const varianceData = useMemo(() => {
    return vehicles.map(vehicle => {
      const vehicleRotations = rotations.filter(r => r.vehicle_id === vehicle.id);
      const theorique = vehicleRotations.reduce((s, r) => s + (r.litres_carburant_alloues || 0), 0);
      const refuelsVehicle = entries.filter(e => e.vehicle_id === vehicle.id);
      const reel = refuelsVehicle.reduce((s, e) => s + (e.litres || 0), 0);
      const ecart = reel - theorique;
      const ecartPct = theorique > 0 ? (ecart / theorique) * 100 : 0;
      const coutReel = refuelsVehicle.reduce((s, e) => s + (e.montant_total || 0), 0);
      const rotCount = vehicleRotations.length;
      return { vehicle, theorique, reel, ecart, ecartPct, coutReel, rotCount };
    }).filter(d => d.rotCount > 0 || d.reel > 0);
  }, [vehicles, rotations, entries]);

  const totalEcart = varianceData.reduce((s, d) => s + d.ecart, 0);
  const alertCount = varianceData.filter(d => Math.abs(d.ecartPct) > 15).length;

  const handleEdit = (entry) => { setEditEntry(entry); setDialogOpen(true); };
  const handleNew = () => { setEditEntry(null); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Fuel className="w-6 h-6 text-secondary" />
            Gestion du Carburant
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {entries.length} entrées · {autoRefuels.length} refuels auto · {manuelRefuels.length} saisies manuelles
          </p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" /> Nouvel approvisionnement
        </Button>
      </div>

      <FuelKpiStrip
        totalMontant={totalMontantMois}
        totalLitres={totalLitresMois}
        avgPrix={avgPrix}
        alertCount={alertCount}
        totalEcart={totalEcart}
        formatCFA={formatCFA}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 flex-wrap h-auto gap-1">
          <TabsTrigger value="approvisionnements" className="flex items-center gap-1.5 text-xs">
            <Fuel className="w-3.5 h-3.5" /> Approvisionnements
          </TabsTrigger>
          <TabsTrigger value="camions" className="flex items-center gap-1.5 text-xs">
            <Truck className="w-3.5 h-3.5" /> Performance camions
          </TabsTrigger>
          <TabsTrigger value="campagnes" className="flex items-center gap-1.5 text-xs">
            <BarChart2 className="w-3.5 h-3.5" /> Par campagne
          </TabsTrigger>
          <TabsTrigger value="ecarts" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> Analyse écarts
            {alertCount > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alertes" className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Alertes
            {alertCount > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvisionnements" className="mt-4">
          <FuelSupplyTable
            entries={entries}
            isLoading={isLoading}
            vMap={vMap}
            campaignMap={campaignMap}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="camions" className="mt-4">
          <FuelVehiclePerformance
            vehicles={vehicles}
            rotations={rotations}
            entries={entries}
            formatCFA={formatCFA}
          />
        </TabsContent>

        <TabsContent value="campagnes" className="mt-4">
          <FuelCampaignTab
            campaigns={campaigns}
            rotations={rotations}
            entries={entries}
            clients={clients}
            vehicles={vehicles}
            formatCFA={formatCFA}
          />
        </TabsContent>

        <TabsContent value="ecarts" className="mt-4">
          <FuelVarianceTable data={varianceData} formatCFA={formatCFA} />
        </TabsContent>

        <TabsContent value="alertes" className="mt-4">
          <FuelAlertsTab
            vehicles={vehicles}
            rotations={rotations}
            entries={entries}
            campaigns={campaigns}
            clients={clients}
            formatCFA={formatCFA}
          />
        </TabsContent>
      </Tabs>

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