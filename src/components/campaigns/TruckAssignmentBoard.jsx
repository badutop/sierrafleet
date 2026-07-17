import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, GripVertical, Ship, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";

// Aligné sur le vrai vocabulaire de statut (CampaignsList.jsx) — voir
// CampaignDetail.jsx pour le contexte du fix.
const statutColors = {
  creee: "bg-blue-500/10 text-blue-600",
  validee_responsable: "bg-purple-500/10 text-purple-600",
  validee_operationnel: "bg-cyan-500/10 text-cyan-600",
  en_cours: "bg-emerald-500/10 text-emerald-600",
  terminee: "bg-amber-500/10 text-amber-600",
  clôturée: "bg-muted text-muted-foreground",
};
const statutLabels = { creee: "Créée", validee_responsable: "Validée (Responsable)", validee_operationnel: "Validée (Opérationnel)", en_cours: "En cours", terminee: "Terminée", clôturée: "Clôturée" };

// Un camion "affecté" à une campagne = vehicles.campaign_id (un camion ne peut
// être affecté qu'à une seule campagne à la fois) — indépendant des rotations
// réelles, qui ne commencent qu'à la saisie de la fiche du jour.
export default function TruckAssignmentBoard({ campaigns }) {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  // Per-campaign: which vehicles are being selected to add (multi-select)
  const [addingTo, setAddingTo] = useState({}); // { [campaignId]: string[] }

  const { data: vehicles = [] } = useQuery({
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
      vehicles
        .filter(v =>
          v.statut === "en_maintenance" ||
          v.statut === "hors_service" ||
          maintenanceVehicleIds.has(v.id)
        )
        .map(v => v.immatriculation)
    );
  }, [vehicles, maintenances]);

  // Move truck: réaffecte le camion à une autre campagne
  const moveMutation = useMutation({
    mutationFn: async ({ vehicleId, newCampaignId }) => {
      const { error } = await supabase.from("vehicles").update({ campaign_id: newCampaignId }).eq("id", vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Camion réaffecté avec succès");
    },
  });

  // Assign new truck(s) to campaign
  const assignMutation = useMutation({
    mutationFn: async ({ vehicleIds, campaignId }) => {
      const { error } = await supabase.from("vehicles").update({ campaign_id: campaignId }).in("id", vehicleIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Camion affecté à la campagne");
    },
  });

  // Remove truck from campaign
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

  const activeCampaigns = campaigns.filter(c => c.statut !== "terminee");

  // Camions affectés par campagne
  const campaignTrucks = useMemo(() => {
    const result = {};
    activeCampaigns.forEach(c => { result[c.id] = vehicles.filter(v => v.campaign_id === c.id); });
    return result;
  }, [vehicles, activeCampaigns]);

  const assignedVehicleIds = useMemo(() => {
    const map = {};
    activeCampaigns.forEach(c => {
      map[c.id] = new Set((campaignTrucks[c.id] || []).map(v => v.id));
    });
    return map;
  }, [campaignTrucks, activeCampaigns]);

  const onDragStart = () => setIsDragging(true);
  const onDragEnd = (result) => {
    setIsDragging(false);
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    moveMutation.mutate({ vehicleId: draggableId, newCampaignId: destination.droppableId });
  };

  const handleAssign = (campaignId) => {
    const vehicleIds = addingTo[campaignId] || [];
    if (vehicleIds.length === 0) return;
    assignMutation.mutate({ vehicleIds, campaignId });
    setAddingTo(prev => ({ ...prev, [campaignId]: [] }));
  };

  if (activeCampaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Ship className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucune campagne active</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <GripVertical className="w-3.5 h-3.5" />
        Glissez un camion d'une colonne à une autre pour le transférer, ou utilisez le sélecteur pour en affecter un nouveau.
      </p>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeCampaigns.map(campaign => {
            const trucks = campaignTrucks[campaign.id] || [];
            const alreadyAssigned = assignedVehicleIds[campaign.id] || new Set();
            const availableVehicles = vehicles.filter(v =>
              !alreadyAssigned.has(v.id) &&
              !v.campaign_id &&
              !blockedImmatriculations.has(v.immatriculation)
            );

            return (
              <Card key={campaign.id} className={cn("transition-all", isDragging && "ring-2 ring-primary/20")}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{campaign.nom_campagne}</CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {trucks.length} camion{trucks.length !== 1 ? "s" : ""} assigné{trucks.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge className={cn("text-[10px] shrink-0", statutColors[campaign.statut])}>{statutLabels[campaign.statut]}</Badge>
                  </div>
                </CardHeader>

                <Droppable droppableId={campaign.id}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[100px] px-4 pb-3 space-y-2 rounded-b-xl transition-colors",
                        snapshot.isDraggingOver && "bg-primary/5"
                      )}
                    >
                      {trucks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-16 border-2 border-dashed border-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Déposer ou affecter un camion</p>
                        </div>
                      )}
                      {trucks.map((vehicle, index) => (
                        <Draggable key={vehicle.id} draggableId={vehicle.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-xs select-none transition-shadow",
                                snap.isDragging && "shadow-xl ring-2 ring-primary cursor-grabbing"
                              )}
                            >
                              <div {...prov.dragHandleProps} className="cursor-grab">
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              </div>
                              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Truck className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold truncate">{vehicle.immatriculation}</p>
                                <p className="text-muted-foreground truncate">{vehicle.code_camion && `${vehicle.code_camion} · `}{vehicle.marque} {vehicle.modele}</p>
                              </div>
                              <button
                                onClick={async () => { if (await confirm(`Retirer ${vehicle.immatriculation} de cette campagne ?`)) removeMutation.mutate(vehicle.id); }}
                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Add truck row with multi-select checkboxes */}
                      {availableVehicles.length > 0 && (
                        <div className="pt-1 space-y-2">
                          <div className="text-xs text-muted-foreground font-medium">
                            Sélectionner les camions à affecter :
                          </div>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-border rounded-lg bg-background">
                            {availableVehicles.map(v => {
                              const isSelected = (addingTo[campaign.id] || []).includes(v.id);
                              return (
                                <label
                                  key={v.id}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-md border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-secondary/10 border-secondary/50 shadow-sm'
                                      : 'bg-muted/30 border-transparent hover:bg-muted/50'
                                  }`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setAddingTo(prev => ({
                                          ...prev,
                                          [campaign.id]: [...(prev[campaign.id] || []), v.id]
                                        }));
                                      } else {
                                        setAddingTo(prev => ({
                                          ...prev,
                                          [campaign.id]: (prev[campaign.id] || []).filter(id => id !== v.id)
                                        }));
                                      }
                                    }}
                                    className="data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{v.immatriculation}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {v.code_camion && `${v.code_camion} · `}{v.marque} {v.modele}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          {(addingTo[campaign.id] || []).length > 0 && (
                            <Button
                              size="sm"
                              className="w-full h-9 mt-1 text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium"
                              onClick={() => handleAssign(campaign.id)}
                              disabled={assignMutation.isPending}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Affecter {(addingTo[campaign.id] || []).length} camion{(addingTo[campaign.id] || []).length !== 1 ? 's' : ''} sélectionné{(addingTo[campaign.id] || []).length !== 1 ? 's' : ''}
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Droppable>
              </Card>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
