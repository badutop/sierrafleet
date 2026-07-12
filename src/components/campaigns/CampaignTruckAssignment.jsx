import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statutVehicule = {
  disponible: { label: "Disponible", color: "bg-emerald-500/10 text-emerald-600" },
  en_mission: { label: "En mission", color: "bg-blue-500/10 text-blue-600" },
  en_maintenance: { label: "En maintenance", color: "bg-amber-500/10 text-amber-600" },
  hors_service: { label: "Hors service", color: "bg-destructive/10 text-destructive" },
};

export default function CampaignTruckAssignment({ campaignId }) {
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const { data: allVehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch assignments for this campaign (rotations with unique vehicles)
  const { data: rotations = [], isLoading } = useQuery({
    queryKey: ["rotations", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotations").select("*").eq("campaign_id", campaignId);
      if (error) throw error;
      return data;
    },
  });

  // Deduplicate: one record per vehicle (latest rotation)
  const assignedRotations = useMemo(() => {
    const seen = new Map();
    [...rotations]
      .sort((a, b) => new Date(b.date_rotation || 0) - new Date(a.date_rotation || 0))
      .forEach(r => { if (!seen.has(r.vehicle_id)) seen.set(r.vehicle_id, r); });
    return [...seen.values()];
  }, [rotations]);

  const assignedVehicleIds = useMemo(() => new Set(assignedRotations.map(r => r.vehicle_id)), [assignedRotations]);
  const vehicleMap = useMemo(() => Object.fromEntries(allVehicles.map(v => [v.id, v])), [allVehicles]);

  const availableVehicles = allVehicles.filter(v => !assignedVehicleIds.has(v.id));

  const assignMutation = useMutation({
    mutationFn: async (vehicleId) => {
      const { error } = await supabase.from("rotations").insert({
        id: crypto.randomUUID(),
        campaign_id: campaignId,
        vehicle_id: vehicleId,
        date_rotation: new Date().toISOString(),
        statut: "en_cours",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["rotations-all"] });
      setSelectedVehicleId("");
      toast.success("Camion affecté à la campagne");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (rotationId) => {
      const { error } = await supabase.from("rotations").delete().eq("id", rotationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["rotations-all"] });
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
      <div className="flex gap-2 items-center">
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
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-200"
          onClick={handleAssign}
          disabled={!selectedVehicleId || assignMutation.isPending}
        >
          <Plus className="w-4 h-4 mr-1" /> Affecter le camion
        </Button>
      </div>

      {/* Assigned trucks list */}
      {assignedRotations.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-muted rounded-xl text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun camion affecté à cette campagne</p>
          <p className="text-xs mt-1">Utilisez le sélecteur ci-dessus pour en ajouter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assignedRotations.map(rotation => {
            const v = vehicleMap[rotation.vehicle_id];
            if (!v) return null;
            const st = statutVehicule[v.statut] || statutVehicule.disponible;
            return (
              <div key={rotation.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {v.code_camion && (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">{v.code_camion}</span>
                    )}
                    <span className="font-bold text-sm font-mono">{v.immatriculation}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{v.marque} {v.modele}</p>
                  <Badge className={cn("text-[10px] mt-1", st.color)}>{st.label}</Badge>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Confirmer le retrait du camion ${v.immatriculation}${v.code_camion ? ` (${v.code_camion})` : ""} de cette campagne ?\n\nCette action supprimera l'affectation.`)) {
                      removeMutation.mutate(rotation.id);
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  disabled={removeMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {assignedRotations.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {assignedRotations.length} camion{assignedRotations.length > 1 ? "s" : ""} affecté{assignedRotations.length > 1 ? "s" : ""} à cette campagne
        </p>
      )}
    </div>
  );
}