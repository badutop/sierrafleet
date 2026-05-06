import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PlayCircle, XCircle, ChevronRight, ShieldCheck } from "lucide-react";

const STATUT_COLORS = {
  planifie: "bg-blue-500/15 text-blue-700",
  en_cours: "bg-amber-500/15 text-amber-700",
  realise: "bg-emerald-500/15 text-emerald-700",
  annule: "bg-muted text-muted-foreground",
};
import { cn } from "@/lib/utils";
const TRANSITIONS = {
  planifie:  { next: "en_cours",  nextLabel: "▶ Démarrer l'intervention", nextIcon: PlayCircle,    nextClass: "bg-amber-500 hover:bg-amber-600 text-white" },
  en_cours:  { next: "realise",   nextLabel: "✔ Valider terminé",          nextIcon: CheckCircle2,  nextClass: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  realise:   { next: null },
  annule:    { next: null },
};

const STATUT_LABELS = {
  planifie: "Prévu",
  en_cours: "En cours",
  realise: "Réalisé",
  annule: "Annulé",
};

export default function MaintenanceValidationPanel({ maintenance, vMap, onStatusChange, isPending }) {
  const [obs, setObs] = useState("");
  const [showObs, setShowObs] = useState(false);

  const trans = TRANSITIONS[maintenance.statut] || {};
  const NextIcon = trans.nextIcon;

  const handleTransition = () => {
    onStatusChange(maintenance.id, trans.next, obs);
    setObs("");
    setShowObs(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Titre Chef de garage */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        Validation Chef de garage
      </div>

      {/* Infos clé */}
      <div className="text-xs space-y-0.5">
        {vMap && vMap[maintenance.vehicle_id] && (
          <div className="font-semibold text-foreground">
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-1 rounded mr-1">{vMap[maintenance.vehicle_id].code_camion}</span>
            {vMap[maintenance.vehicle_id].immatriculation}
          </div>
        )}
        <div className="text-muted-foreground">
          {maintenance.designation || maintenance.type_entretien}
          {maintenance.prestataire && <span className="ml-2">· {maintenance.prestataire}</span>}
        </div>
        <Badge className={cn("text-[10px]", STATUT_COLORS[maintenance.statut])}>
          {STATUT_LABELS[maintenance.statut]}
        </Badge>
      </div>

      {/* Bouton de transition */}
      {trans.next && (
        <div className="space-y-2">
          {showObs && (
            <Textarea
              className="text-sm"
              rows={2}
              placeholder="Note du chef de garage (optionnel)..."
              value={obs}
              onChange={e => setObs(e.target.value)}
            />
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setShowObs(v => !v)}
            >
              {showObs ? "Masquer note" : "Ajouter une note"}
            </Button>
            <Button
              size="sm"
              className={cn("flex-1 text-xs gap-1.5", trans.nextClass)}
              disabled={isPending}
              onClick={handleTransition}
            >
              <NextIcon className="w-3.5 h-3.5" />
              {isPending ? "Enregistrement..." : trans.nextLabel}
              <ChevronRight className="w-3 h-3 ml-auto" />
            </Button>
          </div>
        </div>
      )}

      {/* Statut final */}
      {maintenance.statut === "realise" && (
        <div className="flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" /> Intervention validée et terminée
        </div>
      )}
      {maintenance.statut === "annule" && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground bg-muted/50 border border-border rounded-lg py-2 text-xs">
          <XCircle className="w-4 h-4" /> Annulée
        </div>
      )}
    </div>
  );
}