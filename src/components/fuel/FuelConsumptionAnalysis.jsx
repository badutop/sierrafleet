import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FuelConsumptionAnalysis({ consumptionData, formatCFA }) {
  if (consumptionData.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée de consommation disponible</p>;
  }

  // Trier par écart de consommation
  const sorted = [...consumptionData].sort((a, b) => Math.abs(b.ecartPct) - Math.abs(a.ecartPct));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map(d => (
          <Card key={d.vehicle.id} className={cn(
            "border-l-4",
            Math.abs(d.ecartPct) > 15 ? "border-l-destructive" : Math.abs(d.ecartPct) > 5 ? "border-l-amber-500" : "border-l-emerald-600"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{d.vehicle.immatriculation}</CardTitle>
                    <p className="text-xs text-muted-foreground">{d.vehicle.marque} {d.vehicle.modele}</p>
                  </div>
                </div>
                {Math.abs(d.ecartPct) > 15 && (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Théorique</p>
                  <p className="text-sm font-semibold">{Math.round(d.theoriqueLitres)} L</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Réel</p>
                  <p className="text-sm font-semibold">{Math.round(d.reelLitres)} L</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Écart</p>
                  <p className={cn(
                    "text-sm font-semibold",
                    d.ecartLitres > 0 ? "text-destructive" : "text-emerald-600"
                  )}>
                    {d.ecartLitres > 0 ? "+" : ""}{Math.round(d.ecartLitres)} L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Variation</p>
                  <div className="flex items-center gap-1">
                    {d.ecartPct > 0 ? (
                      <TrendingUp className="w-3 h-3 text-destructive" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-emerald-600" />
                    )}
                    <span className={cn(
                      "text-sm font-semibold",
                      Math.abs(d.ecartPct) > 15 ? "text-destructive" : Math.abs(d.ecartPct) > 5 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {d.ecartPct > 0 ? "+" : ""}{d.ecartPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Consommation L/100km</span>
                  <span className="font-semibold">{d.consommation_l100.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Rotations</span>
                  <span className="font-semibold">{d.rotationCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Km total</span>
                  <span className="font-semibold">{Math.round(d.totalKm)} km</span>
                </div>
              </div>

              {Math.abs(d.ecartPct) > 15 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded px-2 py-1.5">
                  <p className="text-xs text-destructive font-medium">
                    {d.ecartPct > 0 ? "Surconsommation détectée" : "Sous-consommation anormale"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}