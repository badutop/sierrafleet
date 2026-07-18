import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";

const statutVehicule = {
  disponible: { label: "Disponible", color: "bg-emerald-500/10 text-emerald-600" },
  en_mission: { label: "En mission", color: "bg-blue-500/10 text-blue-600" },
  en_maintenance: { label: "En maintenance", color: "bg-amber-500/10 text-amber-600" },
  hors_service: { label: "Hors service", color: "bg-destructive/10 text-destructive" },
};

// Un camion "affecté" à une campagne = vehicles.campaign_id pointe vers elle
// (un camion ne peut être affecté qu'à une seule campagne à la fois). Cette
// affectation est indépendante des rotations réelles : elle ne commence à
// compter comme rotation qu'à la saisie de la fiche du jour.
export default function CampaignTruckAssignmentTable({ campaignId, readOnly = false }) {
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const { data: allVehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: maintenances = [] } = useQuery({
    queryKey: ["maintenances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Immatriculations bloquées : statut en_maintenance/hors_service OU maintenance active
  const blockedImmatriculations = useMemo(() => {
    const maintenanceVehicleIds = new Set(
      maintenances
        .filter(m => m.statut === "en_cours" || m.statut === "planifie")
        .map(m => m.vehicle_id)
    );
    return new Set(
      allVehicles
        .filter(v =>
          v.statut === "en_maintenance" ||
          v.statut === "hors_service" ||
          maintenanceVehicleIds.has(v.id)
        )
        .map(v => v.immatriculation)
    );
  }, [allVehicles, maintenances]);

  const assignedVehicles = useMemo(() => allVehicles.filter(v => v.campaign_id === campaignId), [allVehicles, campaignId]);
  const availableVehicles = allVehicles.filter(v =>
    !v.campaign_id &&
    !blockedImmatriculations.has(v.immatriculation)
  );

  const assignMutation = useMutation({
    mutationFn: async (vehicleId) => {
      const { error } = await supabase.from("vehicles").update({ campaign_id: campaignId }).eq("id", vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setSelectedVehicleId("");
      toast.success("Camion affecté à la campagne");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (vehicleId) => {
      const { error } = await supabase.from("vehicles").update({ campaign_id: null }).eq("id", vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Camion retiré de la campagne");
    },
  });

  const handleAssign = () => {
    if (!selectedVehicleId) return;
    assignMutation.mutate(selectedVehicleId);
  };

  if (isLoading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2">
          Campagne archivée — consultation seule, plus d'affectation possible.
        </div>
      )}

      {/* Add vehicle */}
      {!readOnly && (
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
      )}

      {/* Table */}
      {assignedVehicles.length === 0 ? (
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
                {!readOnly && <th className="px-4 py-2.5 text-center font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {assignedVehicles.map(v => {
                const st = statutVehicule[v.statut] || statutVehicule.disponible;
                return (
                  <tr key={v.id} className="border-b hover:bg-muted/30">
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
                    {!readOnly && (
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={async () => {
                            if (await confirm(`Retirer ${v.immatriculation} de cette campagne ?`)) {
                              removeMutation.mutate(v.id);
                            }
                          }}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
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
