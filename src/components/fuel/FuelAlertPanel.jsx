import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FuelAlertPanel({ consumptionData }) {
  const alerts = useMemo(() => {
    const allAlerts = [];

    consumptionData.forEach(d => {
      if (d.ecartPct > 15) {
        allAlerts.push({
          type: "surconsommation",
          severity: "high",
          vehicle: d.vehicle,
          message: `Surconsommation de ${d.ecartPct.toFixed(1)}% (écart: +${Math.round(d.ecartLitres)}L)`,
          data: d,
        });
      } else if (d.ecartPct > 5) {
        allAlerts.push({
          type: "variance",
          severity: "medium",
          vehicle: d.vehicle,
          message: `Variation de ${d.ecartPct.toFixed(1)}% (écart: +${Math.round(d.ecartLitres)}L)`,
          data: d,
        });
      }
      
      if (d.consommation_l100 > 25) {
        allAlerts.push({
          type: "consommation",
          severity: "high",
          vehicle: d.vehicle,
          message: `Consommation élevée: ${d.consommation_l100.toFixed(1)} L/100km`,
          data: d,
        });
      }
    });

    return allAlerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [consumptionData]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-4 h-4" />
        Alertes détectées ({alerts.length})
      </h3>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <Alert key={i} className={cn(
            "border-l-4",
            alert.severity === "high" ? "border-l-destructive bg-destructive/5" : "border-l-amber-500 bg-amber-500/5"
          )}>
            <div className="flex items-start gap-3">
              {alert.severity === "high" ? (
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              ) : (
                <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold">{alert.vehicle.immatriculation}</p>
                <AlertDescription className="text-xs mt-0.5">
                  {alert.message}
                </AlertDescription>
                <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                  <span>{alert.data.rotationCount} rotation(s)</span>
                  <span>•</span>
                  <span>{Math.round(alert.data.totalKm)} km</span>
                </div>
              </div>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  );
}