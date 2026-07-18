import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Fuel, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getRefuelCheckpoints, consoLitresPourClient } from "@/lib/refuelRules";

// Ne montre plus la liste brute des fuel_entries / rotations saisies : un
// camion n'apparaît ici que lorsqu'il a réalisé 3 rotations d'un même client
// avec les 3 bons physiques confirmés (voir CampaignRotationsTable). La
// validation ne fait que marquer le camion prêt ; le vrai rechargement (et
// son fuel_entries) se fait ensuite via le module Rechargement Auto.
export default function FuelValidationTab({ rotations, vehicles, clients = [], onLaunchRecharge }) {
  const queryClient = useQueryClient();
  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const validateMutation = useMutation({
    mutationFn: async (checkpointId) => {
      const { error } = await supabase.from("rotations").update({ refuel_effectue: true }).eq("id", checkpointId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations"] });
      toast.success("Camion validé pour rechargement");
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const checkpoints = getRefuelCheckpoints(rotations);
  const aValider = checkpoints.filter(c => !c.validated);
  const aRecharger = checkpoints.filter(c => c.validated);

  if (checkpoints.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        Aucun camion éligible pour l'instant — un camion apparaît ici après 3 rotations d'un même client avec les 3 bons physiques confirmés.
      </p>
    );
  }

  const renderCard = (item) => {
    const vehicle = vMap[item.vehicleId];
    const client = clientMap[item.clientId];
    const conso = consoLitresPourClient(client) * 3;
    const dernierBon = item.checkpoint.date_rotation ? format(new Date(item.checkpoint.date_rotation), "d MMM yyyy", { locale: fr }) : "—";

    return (
      <Card key={item.checkpoint.id} className="border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4 text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{vehicle?.immatriculation || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {client?.nom || "—"} · 3 rotations · dernier bon le {dernierBon}
                </p>
              </div>
            </div>

            <div className="text-center shrink-0">
              <p className="text-xs text-muted-foreground">Conso. théorique</p>
              <p className="font-bold">{conso} L</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {item.validated ? (
                <>
                  <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Validé</Badge>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground px-2"
                    onClick={() => onLaunchRecharge(vehicle, item.checkpoint.id)}
                  >
                    <Zap className="w-3.5 h-3.5 mr-1" /> Déclencher le rechargement auto
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                  onClick={() => validateMutation.mutate(item.checkpoint.id)}
                  disabled={validateMutation.isPending}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Valider
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      {aValider.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">À valider ({aValider.length})</h3>
          <div className="space-y-3">{aValider.map(renderCard)}</div>
        </div>
      )}
      {aRecharger.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Validés — en attente de rechargement ({aRecharger.length})</h3>
          <div className="space-y-3">{aRecharger.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}
