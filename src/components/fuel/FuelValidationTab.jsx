import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, Fuel } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getRefuelCheckpoints, consoLitresPourClient } from "@/lib/refuelRules";
import { logAudit } from "@/lib/auditLog";
import { notifyFuelStationsAuthorized } from "@/lib/fuelStationNotify";

// Ne montre plus la liste brute des fuel_entries / rotations saisies : un
// camion n'apparaît ici que lorsqu'il a réalisé 3 rotations d'un même client
// avec les 3 bons physiques scannés (à la saisie de la fiche du jour, voir
// RotationSheetEntry). C'est ici, et uniquement ici, que les bons sont
// validés (bon_physique_recu, sur les 3 rotations à la fois) — Campagnes >
// Rotations n'affiche plus qu'un statut passif "À valider". C'est seulement
// après cette validation que le chauffeur peut voir ses bons dans son espace
// et recharger. Le déclenchement du rechargement lui-même est désormais
// exclusivement réservé au chauffeur, depuis son propre espace
// (DriverRefuelPage.jsx) — plus de bouton "Déclencher" ici pour Admin.
export default function FuelValidationTab({ rotations, vehicles, clients = [], zones = [] }) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  // Admin, Resp. Exploitation et Resp. des Opérations peuvent valider un
  // camion pour rechargement (Finances n'y a pas accès) — c'est aussi lui
  // qui peut ajuster le litrage théorique avant de valider (voir
  // CheckpointCard).
  const canValidateRecharge = ["admin", "responsable_exploitation", "responsable_operations"].includes(currentUser?.role);

  const validateMutation = useMutation({
    mutationFn: async ({ item, litres }) => {
      // Mise à jour du checkpoint conditionnée à refuel_effectue=false :
      // exclusivité avec l'auto-validation système (voir
      // maybeAutoValidateCheckpoint, driverBonEntry.js) — si le système
      // vient de valider automatiquement au même instant, cette requête
      // n'affecte 0 ligne et on prévient plutôt que d'écraser sa validation.
      const payload = { refuel_effectue: true, litres_valides: Number(litres) || 0 };
      const { data: updated, error } = await supabase
        .from("rotations").update(payload)
        .eq("id", item.checkpoint.id).eq("refuel_effectue", false)
        .select("id");
      if (error) throw error;
      if (!updated?.length) throw new Error("Déjà validé entre-temps (probablement par le système)");

      // Valide les 3 bons du groupe d'un coup — c'est la seule étape qui
      // renseigne bon_physique_recu désormais (plus dans Campagnes > Rotations).
      const rotationIds = item.rotations.map(r => r.id);
      const { error: bonError } = await supabase.from("rotations").update({ bon_physique_recu: true }).in("id", rotationIds);
      if (bonError) throw bonError;
      await logAudit("Carburant", item.checkpoint.id, "update", { ...payload, bon_physique_recu: true }, null, [...Object.keys(payload), "bon_physique_recu"]);

      notifyFuelStationsAuthorized({
        vehicleImmat: vMap[item.vehicleId]?.immatriculation,
        driverId: item.checkpoint.driver_id,
        litres: payload.litres_valides,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations"] });
      toast.success("Bons validés — camion prêt pour rechargement");
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const checkpoints = getRefuelCheckpoints(rotations);
  const aValider = checkpoints.filter(c => !c.validated);
  const aRecharger = checkpoints.filter(c => c.validated);

  if (checkpoints.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        Aucun camion éligible pour l'instant — un camion apparaît ici après 3 rotations d'un même client avec les 3 bons physiques scannés.
      </p>
    );
  }

  const renderCard = (item) => (
    <CheckpointCard
      key={item.checkpoint.id}
      item={item}
      vehicle={vMap[item.vehicleId]}
      client={clientMap[item.clientId]}
      zones={zones}
      canValidateRecharge={canValidateRecharge}
      isValidating={validateMutation.isPending}
      onValidate={(item, litres) => validateMutation.mutate({ item, litres })}
    />
  );

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

function CheckpointCard({ item, vehicle, client, zones, canValidateRecharge, isValidating, onValidate }) {
  const theorique = consoLitresPourClient(client, zones) * 3;
  // Litrage ajusté par le Resp. Exploitation (ou Admin) avant validation —
  // pré-rempli avec le théorique (zone × 3), modifiable tant que non validé.
  const [litresDraft, setLitresDraft] = useState(() => String(item.checkpoint.litres_valides ?? theorique));
  const litresValides = Number(item.checkpoint.litres_valides ?? theorique);
  const dernierBon = item.checkpoint.date_rotation ? format(new Date(item.checkpoint.date_rotation), "d MMM yyyy", { locale: fr }) : "—";

  return (
    <Card className="border border-sidebar">
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
            <p className="text-xs text-muted-foreground">{item.validated ? "Litrage validé" : "Litrage théorique"}</p>
            {!item.validated && canValidateRecharge ? (
              <Input
                type="number" min="0"
                className="h-7 w-20 text-right font-bold"
                value={litresDraft}
                onChange={e => setLitresDraft(e.target.value)}
              />
            ) : (
              <p className="font-bold">{item.validated ? litresValides : theorique} L</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {item.validated ? (
              <>
                <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Validé</Badge>
                <span className="text-xs text-muted-foreground italic">En attente de déclenchement par le chauffeur</span>
              </>
            ) : canValidateRecharge ? (
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                onClick={() => onValidate(item, litresDraft)}
                disabled={isValidating}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Valider
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground italic">En attente de validation</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
