import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statutVehicule = {
  disponible: { label: "Disponible", color: "bg-emerald-500/10 text-emerald-600" },
  en_mission: { label: "En mission", color: "bg-blue-500/10 text-blue-600" },
  en_maintenance: { label: "En maintenance", color: "bg-amber-500/10 text-amber-600" },
  hors_service: { label: "Hors service", color: "bg-destructive/10 text-destructive" },
};

export default function CampaignTruckAssignmentTable({ campaignId }) {
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const { data: allVehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: rotations = [], isLoading } = useQuery({
    queryKey: ["rotations", campaignId],
    queryFn: () => base44.entities.Rotation.filter({ campaign_id: campaignId }),
  });

  const { data: maintenances = [] } = useQuery({
    queryKey: ["maintenances"],
    queryFn: () => base44.entities.Maintenance.list(),
  });

  // IDs de véhicules ayant une maintenance active (en_cours ou planifie)
  const vehiclesInMaintenance = useMemo(() => {
    return new Set(
      maintenances
        .filter(m => m.statut === "en_cours" || m.statut === "planifie")
        .map(m => m.vehicle_id)
    );
  }, [maintenances]);

  const assignedRotations = useMemo(() => {
    const seen = new Map();
    [...rotations]
      .sort((a, b) => new Date(b.date_rotation || 0) - new Date(a.date_rotation || 0))
      .forEach(r => { if (!seen.has(r.vehicle_id)) seen.set(r.vehicle_id, r); });
    return [...seen.values()];
  }, [rotations]);

  const assignedVehicleIds = useMemo(() => new Set(assignedRotations.map(r => r.vehicle_id)), [assignedRotations]);
  const vehicleMap = useMemo(() => Object.fromEntries(allVehicles.map(v => [v.id, v])), [allVehicles]);
  const availableVehicles = allVehicles.filter(v =>
    !assignedVehicleIds.has(v.id) &&
    v.statut !== "en_maintenance" &&
    v.statut !== "hors_service" &&
    !vehiclesInMaintenance.has(v.id)
  );

  const assignMutation = useMutation({
    mutationFn: (vehicleId) =>
      base44.entities.Rotation.create({
        campaign_id: campaignId,
        vehicle_id: vehicleId,
        date_rotation: new Date().toISOString(),
        statut: "en_cours",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations", campaignId] });
      setSelectedVehicleId("");
      toast.success("Camion affecté à la campagne");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (rotationId) => base44.entities.Rotation.delete(rotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations", campaignId] });
      toast.success("Camion retiré de la campagne");
    },
  });

  const handleAssign = () => {
    if (!selectedVehicleId) return;
    if (assignedVehicleIds.has(selectedVehicleId)) {
      toast.error("Ce camion est déjà affecté à cette campagne");
      return;
    }
    assignMutation.mutate(selectedVehicleId);
  };

  if (isLoading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Add vehicle */}
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
          <SelectTrigger className="flex-1 max-w-sm">
            <SelectValue placeholder="Sélectionner un camion à affecter…" />
          </SelectTrigger>
          <SelectContent>
            {availableVehicles.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Tous les camions sont déjà affectés</div>
            ) : (
              availableVehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.code_camion ? `[${v.code_camion}] ` : ""}{v.immatriculation}{v.marque ? ` — ${v.marque} ${v.modele || ""}` : ""}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          onClick={handleAssign}
          disabled={!selectedVehicleId || assignMutation.isPending}
        >
          <Plus className="w-4 h-4 mr-1" /> Affecter
        </Button>
      </div>

      {/* Table */}
      {assignedRotations.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun camion affecté à cette campagne</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Code</th>
                <th className="px-4 py-2.5 text-left font-semibold">Immatriculation</th>
                <th className="px-4 py-2.5 text-left font-semibold">Marque & Modèle</th>
                <th className="px-4 py-2.5 text-left font-semibold">Statut</th>
                <th className="px-4 py-2.5 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignedRotations.map(rotation => {
                const v = vehicleMap[rotation.vehicle_id];
                if (!v) return null;
                const st = statutVehicule[v.statut] || statutVehicule.disponible;
                return (
                  <tr key={rotation.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      {v.code_camion && (
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">{v.code_camion}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold">{v.immatriculation}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{v.marque} {v.modele}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={cn("text-[10px]", st.color)}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`Retirer ${v.immatriculation} de cette campagne ?`)) {
                            removeMutation.mutate(rotation.id);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}