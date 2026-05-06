import React from "react";
import { cn } from "@/lib/utils";
import { Clock, Wrench, CheckCircle2, XCircle, ChevronRight } from "lucide-react";

const STEPS = [
  { key: "planifie",  label: "Planifié",   icon: Clock,         color: "text-blue-600",    bg: "bg-blue-500",    ring: "ring-blue-400" },
  { key: "en_cours",  label: "En cours",   icon: Wrench,        color: "text-amber-600",   bg: "bg-amber-500",   ring: "ring-amber-400" },
  { key: "realise",   label: "Réalisé",    icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-500", ring: "ring-emerald-400" },
];

export default function MaintenanceStatusStepper({ statut, size = "md" }) {
  if (statut === "annule") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <XCircle className="w-3.5 h-3.5" /> Annulé
      </span>
    );
  }

  const currentIdx = STEPS.findIndex(s => s.key === statut);
  const isSmall = size === "sm";

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const pending = idx > currentIdx;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-0.5">
              <div className={cn(
                "rounded-full flex items-center justify-center transition-all",
                isSmall ? "w-5 h-5" : "w-7 h-7",
                done && `${step.bg} text-white`,
                active && `${step.bg} text-white ring-2 ${step.ring} ring-offset-1 shadow-md`,
                pending && "bg-muted text-muted-foreground",
              )}>
                <Icon className={cn(isSmall ? "w-3 h-3" : "w-3.5 h-3.5")} />
              </div>
              {!isSmall && (
                <span className={cn(
                  "text-[9px] font-medium whitespace-nowrap",
                  active ? step.color : done ? "text-foreground/60" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              )}
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                "h-0.5 mb-3.5 transition-all",
                isSmall ? "w-3" : "w-6",
                idx < currentIdx ? "bg-emerald-400" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}