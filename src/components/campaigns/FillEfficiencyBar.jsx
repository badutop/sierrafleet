import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Affiche un indicateur d'efficacité de remplissage.
 * poids_reel : poids réel transporté (en kg)
 * capacite_theorique : capacité théorique max (en kg)
 */
export default function FillEfficiencyBar({ poidsReel, capaciteTheorique, label = "Efficacité remplissage", className }) {
  if (!capaciteTheorique || capaciteTheorique === 0) return null;

  const ratio = Math.min(1, poidsReel / capaciteTheorique);
  const pct = Math.round(ratio * 100);

  const { color, bg, icon: Icon, text } = pct >= 85
    ? { color: "text-emerald-600", bg: "bg-emerald-500", icon: TrendingUp, text: "Excellent" }
    : pct >= 65
    ? { color: "text-blue-600", bg: "bg-blue-500", icon: Minus, text: "Correct" }
    : { color: "text-amber-600", bg: "bg-amber-500", icon: TrendingDown, text: "Faible" };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <div className={cn("flex items-center gap-1 font-bold", color)}>
          <Icon className="w-3.5 h-3.5" />
          <span>{pct}% — {text}</span>
        </div>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-2.5 rounded-full transition-all duration-500", bg)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{(poidsReel / 1000).toFixed(1)} T réel</span>
        <span>{(capaciteTheorique / 1000).toFixed(1)} T capacité théorique</span>
      </div>
    </div>
  );
}