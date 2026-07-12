import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, List, Calendar, Truck, Plus } from "lucide-react";
import { toast } from "sonner";
import MaintenanceKpiStrip from "@/components/maintenance/MaintenanceKpiStrip";
import MaintenanceListTab from "@/components/maintenance/MaintenanceListTab";
import MaintenancePlanningTab from "@/components/maintenance/MaintenancePlanningTab";
import MaintenanceVehicleTab from "@/components/maintenance/MaintenanceVehicleTab";
import MaintenanceDialog from "@/components/maintenance/MaintenanceDialog";

export default function RepairsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [activeTab, setActiveTab] = useState("liste");
  const queryClient = useQueryClient();

  const { data: allMaintenances = [], isLoading } = useQuery({
    queryKey: ["maintenances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance").select("*").order("date_entretien", { ascending: false }).limit(500);
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

  const maintenances = allMaintenances.filter(m => m.categorie === "corrective");

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        const { id, ...rest } = data;
        const { error } = await supabase.from("maintenance").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("maintenance").insert({ id: crypto.randomUUID(), ...data });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      setDialogOpen(false);
      setEditEntry(null);
      toast.success("Réparation enregistrée");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("maintenance").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      toast.success("Réparation supprimée");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, statut, observations }) => {
      const { error } = await supabase.from("maintenance").update({ statut, ...(observations ? { observations } : {}) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      const labels = { en_cours: "démarrée ▶", realise: "validée ✔" };
      toast.success(`Réparation ${labels[vars.statut] || "mise à jour"}`);
    },
  });

  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  const handleEdit = (entry) => { setEditEntry(entry); setDialogOpen(true); };
  const handleNew = () => { setEditEntry(null); setDialogOpen(true); };
  const handleStatusChange = (id, statut, observations) => statusMutation.mutate({ id, statut, observations });

  const planifieeCount = maintenances.filter(m => m.statut === "planifie").length;
  const enCoursCount = maintenances.filter(m => m.statut === "en_cours").length;
  const alertCount = enCoursCount + planifieeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-secondary" />
            Réparations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {maintenances.length} interventions · {enCoursCount} en cours · {planifieeCount} planifiées
          </p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" /> Nouvelle réparation
        </Button>
      </div>

      {/* KPIs */}
      <MaintenanceKpiStrip maintenances={maintenances} vehicles={vehicles} rotations={rotations} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 flex-wrap h-auto gap-1">
          <TabsTrigger value="liste" className="flex items-center gap-1.5 text-xs">
            <List className="w-3.5 h-3.5" /> Toutes les interventions
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5" /> Planning & Alertes
            {alertCount > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="camions" className="flex items-center gap-1.5 text-xs">
            <Truck className="w-3.5 h-3.5" /> Par camion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liste" className="mt-4">
          <MaintenanceListTab
            maintenances={maintenances}
            isLoading={isLoading}
            vMap={vMap}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
            onStatusChange={handleStatusChange}
            isPending={statusMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="planning" className="mt-4">
          <MaintenancePlanningTab
            maintenances={maintenances}
            vehicles={vehicles}
            rotations={rotations}
            onStatusChange={handleStatusChange}
            isPending={statusMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="camions" className="mt-4">
          <MaintenanceVehicleTab
            vehicles={vehicles}
            maintenances={maintenances}
            rotations={rotations}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <MaintenanceDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditEntry(null); }}
        vehicles={vehicles}
        entry={editEntry}
        onSave={(data) => saveMutation.mutate(data)}
        isPending={saveMutation.isPending}
        defaultCategorie="corrective"
      />
    </div>
  );
}