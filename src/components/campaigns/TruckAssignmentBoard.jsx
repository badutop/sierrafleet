import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, GripVertical, Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statutColors = {
  planifiee: "bg-blue-500/10 text-blue-600",
  en_cours: "bg-emerald-500/10 text-emerald-600",
  terminee: "bg-muted text-muted-foreground",
  suspendue: "bg-amber-500/10 text-amber-600"
};
const statutLabels = { planifiee: "Planifiée", en_cours: "En cours", terminee: "Terminée", suspendue: "Suspendue" };

export default function TruckAssignmentBoard({ campaigns }) {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);

  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations-all"],
    queryFn: () => base44.entities.Rotation.list()
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const moveMutation = useMutation({
    mutationFn: ({ rotationId, newCampaignId }) =>
      base44.entities.Rotation.update(rotationId, { campaign_id: newCampaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations-all"] });
      toast.success("Camion réaffecté avec succès");
    },
  });

  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  // Build per-campaign truck assignments from latest rotations (unique vehicles per campaign)
  const campaignTrucks = {};
  campaigns.filter(c => c.statut !== "terminee").forEach(c => { campaignTrucks[c.id] = []; });

  // Get the latest rotation per vehicle per campaign
  const seen = {};
  [...rotations].sort((a, b) => new Date(b.date_rotation) - new Date(a.date_rotation)).forEach(r => {
    if (!campaignTrucks[r.campaign_id]) return;
    const key = `${r.campaign_id}-${r.vehicle_id}`;
    if (!seen[key]) {
      seen[key] = true;
      campaignTrucks[r.campaign_id].push(r);
    }
  });

  const onDragStart = () => setIsDragging(true);

  const onDragEnd = (result) => {
    setIsDragging(false);
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    moveMutation.mutate({ rotationId: draggableId, newCampaignId: destination.droppableId });
  };

  const activeCampaigns = campaigns.filter(c => c.statut !== "terminee");

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
        Glissez un camion d'une colonne à une autre pour le réaffecter à une autre campagne.
      </p>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeCampaigns.map(campaign => {
            const trucks = campaignTrucks[campaign.id] || [];
            return (
              <Card key={campaign.id} className={cn("transition-all", isDragging && "ring-2 ring-primary/20")}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{campaign.nom_campagne}</CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{trucks.length} camion{trucks.length > 1 ? "s" : ""} assigné{trucks.length > 1 ? "s" : ""}</p>
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
                        "min-h-[120px] px-4 pb-4 space-y-2 rounded-b-xl transition-colors",
                        snapshot.isDraggingOver && "bg-primary/5"
                      )}
                    >
                      {trucks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-20 border-2 border-dashed border-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Déposer un camion ici</p>
                        </div>
                      )}
                      {trucks.map((rotation, index) => {
                        const vehicle = vehicleMap[rotation.vehicle_id];
                        if (!vehicle) return null;
                        return (
                          <Draggable key={rotation.id} draggableId={rotation.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-xs cursor-grab select-none transition-shadow",
                                  snap.isDragging && "shadow-xl ring-2 ring-primary cursor-grabbing"
                                )}
                              >
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                  <Truck className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold truncate">{vehicle.immatriculation}</p>
                                  <p className="text-muted-foreground truncate">{vehicle.code_camion && `${vehicle.code_camion} · `}{vehicle.marque} {vehicle.modele}</p>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
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