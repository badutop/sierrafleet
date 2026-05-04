import React from "react";
import { cn } from "@/lib/utils";

export default function KpiCard({ title, value, subtitle, icon: Icon, color = "primary" }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    orange: "bg-secondary/10 text-secondary",
    green: "bg-emerald-500/10 text-emerald-600",
    red: "bg-destructive/10 text-destructive",
    blue: "bg-blue-500/10 text-blue-600",
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-shadow duration-300 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-card-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}