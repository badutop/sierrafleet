import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, UserCheck, ShieldCheck, Truck, CheckCircle2, Lock, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUT_SEQUENCE, STATUT_DATE_COLUMN } from "@/lib/campaignStatus";

const STEP_META = {
  creee: { label: "Créée", icon: FilePlus2, emoji: "📝" },
  validee_responsable: { label: "Validée (Resp.)", icon: UserCheck, emoji: "✅" },
  validee_operationnel: { label: "Validée (Opér.)", icon: ShieldCheck, emoji: "🛡️" },
  en_cours: { label: "En cours", icon: Truck, emoji: "🚚" },
  terminee: { label: "Terminée", icon: CheckCircle2, emoji: "🏁" },
  clôturee: { label: "Clôturée", icon: Lock, emoji: "🔒" },
};

const statutColors = { creee: "bg-blue-500/10 text-blue-600", validee_responsable: "bg-purple-500/10 text-purple-600", validee_operationnel: "bg-cyan-500/10 text-cyan-600", en_cours: "bg-emerald-500/10 text-emerald-600", terminee: "bg-amber-500/10 text-amber-600", clôturee: "bg-muted text-muted-foreground" };
const statutLabels = { creee: "Créée", validee_responsable: "Validée (Responsable)", validee_operationnel: "Validée (Opérationnel)", en_cours: "En cours", terminee: "Terminée", clôturee: "Clôturée" };

const formatDateTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/**
 * Stepper visuel de progression d'une campagne (6 statuts fixes).
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
            return (
              <React.Fragment key={statut}>
                <div className="flex flex-col items-center gap-1.5 w-20 shrink-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      isCompleted && "bg-emerald-500 text-white",
                      isCurrent && "bg-blue-500 text-white ring-4 ring-blue-500/20",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={cn("text-[10px] text-center leading-tight", isCurrent ? "font-semibold text-blue-600" : isCompleted ? "text-emerald-600" : "text-muted-foreground")}>
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
