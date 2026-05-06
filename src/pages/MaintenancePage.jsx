import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Wrench, List, Calendar, Truck, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import MaintenanceKpiStrip from "@/components/maintenance/MaintenanceKpiStrip";
import MaintenanceListTab from "@/components/maintenance/MaintenanceListTab";
import MaintenancePlanningTab from "@/components/maintenance/MaintenancePlanningTab";
import MaintenanceVehicleTab from "@/components/maintenance/MaintenanceVehicleTab";
import MaintenanceDialog from "@/components/maintenance/MaintenanceDialog";

export default function MaintenancePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [activeTab, setActiveTab] = useState("liste");
  const queryClient = useQueryClient();

  const { data: maintenances = [], isLoading } = useQuery({
    queryKey: ["maintenances"],
    queryFn: () => base44.entities.Maintenance.list("-date_entretien", 500),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });
  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations"],
    queryFn: () => base44.entities.Rotation.list("-date_rotation", 1000),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) return base44.entities.Maintenance.update(data.id, data);
      return base44.entities.Maintenance.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      setDialogOpen(false);
      setEditEntry(null);
      toast.success("Intervention enregistrée");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Maintenance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      toast.success("Intervention supprimée");
    },
  });

  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  const handleEdit = (entry) => { setEditEntry(entry); setDialogOpen(true); };
  const handleNew = () => { setEditEntry(null); setDialogOpen(true); };

  const planifieeCount = maintenances.filter(m => m.statut === "planifie").length;
  const enCoursCount = maintenances.filter(m => m.statut === "en_cours").length;
  const alertCount = enCoursCount + planifieeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="w-6 h-6 text-secondary" />
            Maintenance & Réparations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {maintenances.length} interventions · {enCoursCount} en cours · {planifieeCount} planifiées
          </p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" /> Nouvelle intervention
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
          />
        </TabsContent>

        <TabsContent value="planning" className="mt-4">
          <MaintenancePlanningTab
            maintenances={maintenances}
            vehicles={vehicles}
            rotations={rotations}
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
      />
    </div>
  );
}