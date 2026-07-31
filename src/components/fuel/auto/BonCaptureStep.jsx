import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, ArrowRight, Info } from "lucide-react";
import { getPendingBonGroupForVehicle } from "@/lib/refuelRules";

const REQUIRED_BONS = 3;

// Les bons ne sont plus saisis/scannés ici par le chauffeur : ils sont déjà
// scannés à la saisie de la fiche du jour (Campagnes > Rotations), puis
// validés dans Carburant > Validation (Resp. Exploitation ou Admin). Cet
// écran se contente de les afficher avec leur statut, et n'autorise la suite
// du rechargement que lorsque les 3 sont validés.
export default function BonCaptureStep({ drivers, vehicles, rotations, onDone, preselectedDriver = null, preselectedVehicle = null }) {
  const isDriverMode = !!(preselectedDriver && preselectedVehicle);
  const [driverId, setDriverId] = useState(preselectedDriver?.id || "");
  const [vehicleId, setVehicleId] = useState(preselectedVehicle?.id || "");

  const driver = preselectedDriver || drivers.find(d => d.id === driverId);
  const vehicle = preselectedVehicle || vehicles.find(v => v.id === vehicleId);

  const group = useMemo(() => (
    vehicle ? getPendingBonGroupForVehicle(rotations, vehicle.id) : null
  ), [rotations, vehicle]);

  const confirmedCount = group ? group.filter(r => r.bon_physique_recu).length : 0;
  const allConfirmed = group ? confirmedCount === REQUIRED_BONS : false;
  const canProceed = (isDriverMode || (driverId && vehicleId)) && allConfirmed;

  const handleNext = () => {
    const bons = group.map((r, i) => ({
      rotation: r,
      ocrNumber: r.numero_bon_client || null,
      previewUrl: r.bon_physique_scan_url || null,
      slotIndex: i,
    }));
    onDone({ bons, driver, vehicle });
  };

  return (
    <div className="p-5 space-y-5">
      {/* Chauffeur / véhicule — affiché ou sélectionnable */}
      {isDriverMode ? (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Chauffeur</p>
            <p className="text-sm font-bold">{driver?.prenom} {driver?.nom}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Véhicule</p>
            <p className="text-sm font-bold font-mono">{vehicle?.immatriculation}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Chauffeur</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {drivers.filter(d => d.statut !== "inactif").map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.prenom} {d.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Véhicule</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.immatriculation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Instruction */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground">
          Les {REQUIRED_BONS} bons de rotation sont scannés depuis le module <strong>Campagnes</strong> puis validés dans <strong>Carburant</strong>. Ils apparaissent ici pour vérification — le rechargement n'est possible qu'une fois les {REQUIRED_BONS} validés.
        </p>
      </div>

      {/* Statut des bons */}
      {!vehicle ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sélectionnez un véhicule pour voir ses bons.</p>
      ) : !group ? (
        <div className="border border-dashed border-muted-foreground/30 rounded-xl p-4 text-center text-sm text-muted-foreground">
          Aucune rotation en attente de rechargement pour ce véhicule pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {group.map((r, i) => (
            <div
              key={r.id}
              className={`border rounded-xl p-3 flex items-center gap-3 transition-all ${
                r.bon_physique_recu ? "border-green-400 bg-green-50/30" : "border-amber-300 bg-amber-50/30"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Bon {i + 1}{r.numero_bon_client ? ` — N° ${r.numero_bon_client}` : ""}</p>
                <p className="text-xs text-muted-foreground">
                  {r.date_rotation ? new Date(r.date_rotation).toLocaleDateString("fr-FR") : "—"}
                </p>
              </div>
              {r.bon_physique_recu ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 shrink-0">
                  <CheckCircle2 className="w-4 h-4" /> Validé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 shrink-0">
                  <Clock className="w-4 h-4" /> Non validé
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progression */}
      {group && (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div
              className="bg-secondary h-2 rounded-full transition-all"
              style={{ width: `${(confirmedCount / REQUIRED_BONS) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {confirmedCount}/{REQUIRED_BONS} validés
          </span>
        </div>
      )}

      <Button
        className="w-full h-12 text-base font-bold bg-secondary hover:bg-secondary/90 text-white"
        disabled={!canProceed}
        onClick={handleNext}
      >
        <ArrowRight className="w-5 h-5 mr-2" />
        Continuer
      </Button>
    </div>
  );
}
