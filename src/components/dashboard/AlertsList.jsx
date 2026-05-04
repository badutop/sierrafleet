import React from "react";
import { AlertTriangle, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AlertsList({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Alertes</h3>
        <p className="text-sm text-muted-foreground text-center py-6">Aucune alerte active</p>
      </div>
    );
  }

  const iconMap = { warning: AlertTriangle, expiry: Clock, insurance: Shield };
  const colorMap = { critical: "text-destructive bg-destructive/10", warning: "text-amber-500 bg-amber-500/10", info: "text-blue-500 bg-blue-500/10" };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Alertes ({alerts.length})</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.slice(0, 8).map((a, i) => {
          const Icon = iconMap[a.type] || AlertTriangle;
          return (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", colorMap[a.severity] || colorMap.info)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-medium text-card-foreground">{a.title}</p>
                <p className="text-[10px] text-muted-foreground">{a.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}