import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Truck, GripVertical, Ship, X, Repeat, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { confirm } from "@/lib/confirm";
import { logAudit } from "@/lib/auditLog";

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

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
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
  const driverById = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);

  // Liste complète (non filtrée par la recherche/le statut de la page
  // Campagnes) — nécessaire pour retrouver le nom d'une campagne d'origine de
  // redéploiement même si elle n'est plus affichée comme colonne active.
  const { data: allCampaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*");
      if (error) throw error;
      return data;
    },
  });
  const campaignById = useMemo(() => Object.fromEntries(allCampaigns.map(c => [c.id, c])), [allCampaigns]);

  // Move truck: un déplacement direct entre deux campagnes en_cours est un
  // "redéploiement" — tracé via redeploye_depuis_campaign_id/date_redeploiement
  // pour rester visible dans la campagne de réception (calcul de performance).
  // Les rotations déjà effectuées, elles, restent liées à la campagne d'origine
  // via rotations.campaign_id, jamais touché ici.
  const moveMutation = useMutation({
    mutationFn: async ({ vehicleId, sourceCampaignId, newCampaignId }) => {
      const isRedeployment = campaignById[sourceCampaignId]?.statut === "en_cours" && campaignById[newCampaignId]?.statut === "en_cours";
      const payload = {
        campaign_id: newCampaignId,
        redeploye_depuis_campaign_id: isRedeployment ? sourceCampaignId : null,
        date_redeploiement: isRedeployment ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("vehicles").update(payload).eq("id", vehicleId);
      if (error) throw error;
      await logAudit("Véhicule", vehicleId, "update", payload, null, Object.keys(payload));
      return { isRedeployment };
    },
    onSuccess: ({ isRedeployment }) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(isRedeployment ? "Camion redéployé avec succès" : "Camion réaffecté avec succès");
    },
  });

  // Remove truck from campaign — on efface aussi la marque de redéploiement,
  // une future affectation ne doit pas hériter d'un historique périmé.
  const removeMutation = useMutation({
    mutationFn: async (vehicleId) => {
      const payload = { campaign_id: null, redeploye_depuis_campaign_id: null, date_redeploiement: null };
      const { error } = await supabase.from("vehicles").update(payload).eq("id", vehicleId);
      if (error) throw error;
      await logAudit("Véhicule", vehicleId, "update", payload, null, Object.keys(payload));
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

  const onDragStart = () => setIsDragging(true);
  const onDragEnd = (result) => {
    setIsDragging(false);
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    moveMutation.mutate({ vehicleId: draggableId, sourceCampaignId: source.droppableId, newCampaignId: destination.droppableId });
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
        <ArrowRightLeft className="w-3.5 h-3.5" />
        Glissez un camion vers une autre colonne, ou utilisez le menu ⇄ sur chaque camion pour le redéployer instantanément. Seuls les camions déjà affectés à une campagne apparaissent ici — l'affectation de nouveaux camions se fait depuis l'onglet "Camions affectés" de chaque campagne.
      </p>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeCampaigns.map(campaign => {
            const trucks = campaignTrucks[campaign.id] || [];
            const otherCampaigns = activeCampaigns.filter(c => c.id !== campaign.id);

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
                          <p className="text-xs text-muted-foreground">Aucun camion affecté</p>
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
                                <p className="font-bold truncate flex items-center gap-1.5">
                                  {vehicle.immatriculation}
                                  {vehicle.redeploye_depuis_campaign_id && (
                                    <Badge
                                      className="bg-purple-500/10 text-purple-600 text-[9px] px-1.5 py-0 gap-0.5 shrink-0 font-medium"
                                      title={`Redéployé depuis ${campaignById[vehicle.redeploye_depuis_campaign_id]?.nom_campagne || "campagne précédente"}${vehicle.date_redeploiement ? " le " + new Date(vehicle.date_redeploiement).toLocaleDateString("fr-FR") : ""}`}
                                    >
                                      <Repeat className="w-2.5 h-2.5" /> R
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-muted-foreground truncate">
                                  {driverById[vehicle.driver_id] ? `${driverById[vehicle.driver_id].prenom} ${driverById[vehicle.driver_id].nom}` : "Aucun chauffeur"}
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                                    title="Redéployer vers une autre campagne"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Redéployer vers…</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {otherCampaigns.length === 0 && (
                                    <DropdownMenuItem disabled>Aucune autre campagne active</DropdownMenuItem>
                                  )}
                                  {otherCampaigns.map(c => (
                                    <DropdownMenuItem
                                      key={c.id}
                                      className="flex items-center gap-2"
                                      onClick={() => moveMutation.mutate({ vehicleId: vehicle.id, sourceCampaignId: campaign.id, newCampaignId: c.id })}
                                    >
                                      <span className="truncate flex-1">{c.nom_campagne}</span>
                                      <Badge className={cn("text-[9px] shrink-0", statutColors[c.statut])}>{statutLabels[c.statut]}</Badge>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <button
                                onClick={async () => { if (await confirm(`Retirer ${vehicle.immatriculation} de cette campagne ?`)) removeMutation.mutate(vehicle.id); }}
                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                title="Retirer de la campagne"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
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
