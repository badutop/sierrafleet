import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";

// Les bons arrivant ici sont déjà des rotations réelles, déjà confirmées
// (voir BonCaptureStep) — plus d'OCR ni de saisie manuelle : ce simple
// récapitulatif précède la demande de rechargement.
export default function BonValidationStep({ bons, driver, vehicle, onBack, onValidated }) {
  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="font-bold text-base">Récapitulatif avant rechargement</h2>
        <p className="text-xs text-muted-foreground">Les {bons.length} bons ci-dessous sont confirmés</p>
      </div>

      {/* Chauffeur / Véhicule */}
      <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
          {driver?.prenom?.[0]}{driver?.nom?.[0]}
        </div>
        <div>
          <p className="font-semibold text-sm">{driver?.prenom} {driver?.nom}</p>
          <p className="text-xs text-muted-foreground font-mono">{vehicle?.immatriculation}</p>
        </div>
      </div>

      {/* Bons */}
      <div className="space-y-3">
        {bons.map((bon, i) => (
          <div key={bon.rotation?.id || i} className="border border-green-400 bg-green-50/30 rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">Bon {i + 1}{bon.ocrNumber ? ` — N° ${bon.ocrNumber}` : ""}</p>
              <p className="text-xs text-muted-foreground">
                {bon.rotation?.date_rotation ? new Date(bon.rotation.date_rotation).toLocaleDateString("fr-FR") : "—"}
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 text-center text-sm font-semibold bg-green-100 text-green-800">
        ✅ Les {bons.length} bons sont validés — rechargement autorisé
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
        <Button
          className="flex-1 bg-secondary hover:bg-secondary/90 text-white font-bold"
          onClick={() => onValidated(bons)}
        >
          <ArrowRight className="w-4 h-4 mr-2" /> Demander le rechargement
        </Button>
      </div>
    </div>
  );
}
