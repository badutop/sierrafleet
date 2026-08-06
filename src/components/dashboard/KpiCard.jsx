import React from "react";
import { cn } from "@/lib/utils";

export default function KpiCard({ title, value, subtitle, icon: Icon, color = "primary" }) {
  // Le cadre (border-sidebar) est commun à toutes les KpiCards — seul le
  // fond reste teinté par couleur, pour rester assorti au menu latéral.
  const colorMap = {
    primary: { card: "bg-primary/15", icon: "bg-primary/20 text-primary", text: "text-primary" },
    orange:  { card: "bg-secondary/15", icon: "bg-secondary/20 text-secondary", text: "text-secondary" },
    green:   { card: "bg-emerald-500/15", icon: "bg-emerald-500/20 text-emerald-700", text: "text-emerald-700" },
    red:     { card: "bg-destructive/15", icon: "bg-destructive/20 text-destructive", text: "text-destructive" },
    blue:    { card: "bg-blue-500/15", icon: "bg-blue-500/20 text-blue-700", text: "text-blue-700" },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <div className={cn("rounded-xl border border-sidebar p-5 hover:shadow-lg transition-shadow duration-300 group", c.card)}>
      <div className="flex items-start justify-between">
        <div className={cn("space-y-2", c.text)}>
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", c.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}