import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, Play, CheckCircle2, Lock, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUT_SEQUENCE, STATUT_DATE_COLUMN } from "@/lib/campaignStatus";

const STEP_META = {
  creee: { label: "Créée", icon: FilePlus2, emoji: "📝" },
  en_cours: { label: "En Cours", icon: Play, emoji: "▶️" },
  terminee: { label: "Terminée", icon: CheckCircle2, emoji: "🏁" },
  clôturée: { label: "Archivée", icon: Lock, emoji: "🔒" },
};

// Couleur fixe par statut — chaque étape garde la même couleur qu'elle soit
// l'étape active ou déjà dépassée (plutôt que le bleu actif/vert dépassé
// relatif utilisé auparavant).
const STEP_COLOR = {
  creee: { circle: "bg-blue-500 text-white", label: "text-blue-600", ring: "ring-blue-500/60" },
  en_cours: { circle: "bg-emerald-500 text-white", label: "text-emerald-600", ring: "ring-emerald-500/60" },
  terminee: { circle: "bg-orange-500 text-white", label: "text-orange-600", ring: "ring-orange-500/60" },
  clôturée: { circle: "bg-slate-400 text-white", label: "text-slate-500", ring: "ring-slate-400/60" },
};

const statutColors = { creee: "bg-blue-500/10 text-blue-600", en_cours: "bg-emerald-500/10 text-emerald-600", terminee: "bg-orange-500/10 text-orange-600", clôturée: "bg-muted text-muted-foreground" };
const statutLabels = { creee: "Créée", en_cours: "En Cours", terminee: "Terminée", clôturée: "Archivée" };

const formatDateTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/**
 * Stepper visuel de progression d'une campagne (4 statuts fixes).
 * `campaign` doit contenir `statut` et les colonnes date_* horodatant
 * chaque transition (cf. src/lib/campaignStatus.js).
 */
export default function CampaignStatusStepper({ campaign, urgent = false }) {
  const currentIndex = Math.max(0, STATUT_SEQUENCE.indexOf(campaign.statut));

  const reachedLog = STATUT_SEQUENCE
    .slice(0, currentIndex + 1)
    .map(statut => ({ statut, date: campaign[STATUT_DATE_COLUMN[statut]] }))
    .filter(s => s.date);

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-5">
        {/* Badge de statut + tag urgent */}
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[11px]", statutColors[campaign.statut])}>{statutLabels[campaign.statut] || campaign.statut}</Badge>
          {urgent && (
            <Badge className="text-[11px] bg-destructive/10 text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Urgent
            </Badge>
          )}
        </div>

        {/* Étapes horizontales reliées par des lignes */}
        <div className="flex items-start">
          {STATUT_SEQUENCE.map((statut, i) => {
            const meta = STEP_META[statut];
            const Icon = meta.icon;
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            // Chaque étape a désormais une couleur fixe (voir STEP_COLOR) —
            // qu'elle soit l'étape active ou déjà dépassée — plutôt que le
            // bleu (actif)/vert (dépassé) relatif utilisé auparavant. Un
            // simple anneau ne se voyait presque pas (même teinte que le
            // cercle, pas de séparation) : l'étape active est maintenant
            // agrandie, avec un anneau à distance (ring-offset, qui crée un
            // vrai espace visible) et une ombre portée.
            const color = STEP_COLOR[statut];
            return (
              <React.Fragment key={statut}>
                <div className="flex flex-col items-center gap-1.5 w-20 shrink-0">
                  <div
                    className={cn(
                      "rounded-full flex items-center justify-center shrink-0 transition-all",
                      color.circle,
                      isCurrent ? "w-12 h-12 shadow-lg ring-4 ring-offset-2 ring-offset-card" : "w-10 h-10",
                      isCurrent && color.ring
                    )}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className={isCurrent ? "w-6 h-6" : "w-5 h-5"} />}
                  </div>
                  <span className={cn("text-[10px] text-center leading-tight", isCurrent && "font-semibold", color.label)}>
                    {meta.label}
                  </span>
                </div>
                {i < STATUT_SEQUENCE.length - 1 && (
                  <div className={cn("h-0.5 flex-1 mt-5", i < currentIndex ? "bg-emerald-500" : "bg-border")} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Journal d'horodatage — uniquement les statuts déjà atteints */}
        {reachedLog.length > 0 && (
          <div className="border-t border-border pt-3 space-y-1.5">
            {reachedLog.map(({ statut, date }) => (
              <div key={statut} className="flex items-center gap-2 text-xs">
                <span>{STEP_META[statut].emoji}</span>
                <span className="text-muted-foreground flex-1">{STEP_META[statut].label}</span>
                <span className="font-medium">{formatDateTime(date)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
