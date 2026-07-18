import React from "react";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

// Logo stylisé pour "GOALS" (Gestion des Opérations & Activités Logistiques
// de Sierra), pensé pour accompagner le logo image Sierra Logistics sur la
// landing page. Le mot GOALS reste en texte plein (lisibilité garantie) ;
// l'identité "logistique" vient du liseré route en pointillés et du camion
// qui la parcourt, aux couleurs du thème de l'appli (primary navy / secondary
// lime, cf. index.css).
export default function GoalsLogo({ className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 px-5 rounded-lg border border-lime-400/30 bg-gradient-to-br from-primary/60 to-primary/20 shadow-lg shrink-0",
        className
      )}
    >
      <span className="text-xl sm:text-2xl font-extrabold tracking-[0.15em] text-white leading-none">
        GOALS
      </span>
      <div className="flex items-center gap-1 w-full">
        <svg viewBox="0 0 100 4" className="flex-1 h-1 overflow-visible" preserveAspectRatio="none">
          <line x1="0" y1="2" x2="100" y2="2" stroke="#a3e635" strokeWidth="2" strokeDasharray="8 6" strokeLinecap="round" />
        </svg>
        <Truck className="w-3.5 h-3.5 text-lime-400 shrink-0" strokeWidth={2.5} />
      </div>
    </div>
  );
}
