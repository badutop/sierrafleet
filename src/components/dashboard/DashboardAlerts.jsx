import React from "react";
import { AlertTriangle, Clock, Shield, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardAlerts({ alerts }) {
  const iconMap   = { warning: Wrench, expiry: Clock, insurance: Shield };
  const colorMap  = {
    critical: "text-red-700 bg-red-500/15 border-red-400/25",
    warning:  "text-amber-700 bg-amber-500/15 border-amber-400/25",
    info:     "text-blue-700 bg-blue-500/15 border-blue-400/25",
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Alertes actives</h3>
          <p className="text-xs text-muted-foreground">{alerts.length} alerte{alerts.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center mb-2">
            <Shield className="w-5 h-5 text-emerald-700" />
          </div>
          <p className="text-xs text-muted-foreground">Tout est en ordre ✓</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {alerts.slice(0, 8).map((a, i) => {
            const Icon = iconMap[a.type] || AlertTriangle;
            return (
              <div key={i} className={cn("flex items-start gap-3 p-2.5 rounded-lg border", colorMap[a.severity] || colorMap.info)}>
                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{a.title}</p>
                  <p className="text-[10px] opacity-80">{a.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}