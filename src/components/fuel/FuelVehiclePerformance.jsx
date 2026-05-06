import React, { useMemo } from "react";
import { Truck, Fuel, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FuelVehiclePerformance({ vehicles, rotations, entries, formatCFA }) {
  const data = useMemo(() => {
    return vehicles.map(vehicle => {
      const vRotations = rotations.filter(r => r.vehicle_id === vehicle.id);
      const vEntries = entries.filter(e => e.vehicle_id === vehicle.id);

      const nbRotations = vRotations.length;
      const totalTheorique = vRotations.reduce((s, r) => s + (r.litres_carburant_alloues || 0), 0);
      const totalReel = vEntries.reduce((s, e) => s + (e.litres || 0), 0);
      const totalCout = vEntries.reduce((s, e) => s + (e.montant_total || 0), 0);
      const totalPoids = vRotations.reduce((s, r) => s + (r.poids_charge_tonnes || 0), 0);

      const ecart = totalReel - totalTheorique;
      const ecartPct = totalTheorique > 0 ? (ecart / totalTheorique) * 100 : 0;
      const litresParRotation = nbRotations > 0 ? totalReel / nbRotations : 0;
      const coutParTonne = totalPoids > 0 ? totalCout / (totalPoids / 1000) : 0;

      return { vehicle, nbRotations, totalTheorique, totalReel, totalCout, totalPoids, ecart, ecartPct, litresParRotation, coutParTonne };
    }).filter(d => d.nbRotations > 0 || d.totalReel > 0)
      .sort((a, b) => Math.abs(b.ecartPct) - Math.abs(a.ecartPct));
  }, [vehicles, rotations, entries]);

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Aucune donnée — effectuez des rotations pour voir les performances.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {data.map(({ vehicle, nbRotations, totalTheorique, totalReel, totalCout, ecart, ecartPct, litresParRotation, coutParTonne }) => {
        const isAlert = Math.abs(ecartPct) > 15;
        const isMod = Math.abs(ecartPct) > 5 && Math.abs(ecartPct) <= 15;
        const barPct = totalTheorique > 0 ? Math.min((totalReel / totalTheorique) * 100, 150) : 0;

        return (
          <div key={vehicle.id} className={cn(
            "bg-card border rounded-xl p-4 space-y-3",
            isAlert ? "border-destructive/40" : isMod ? "border-amber-400/40" : "border-border"
          )}>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold text-sm font-mono">{vehicle.immatriculation}</span>
                  {vehicle.code_camion && (
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">{vehicle.code_camion}</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{vehicle.marque} {vehicle.modele}</p>
              </div>
              <div className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-full",
                isAlert ? "bg-destructive/15 text-destructive" : isMod ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700"
              )}>
                {isAlert ? "⚠ ALERTE" : isMod ? "~ MODÉRÉ" : "✓ OK"}
              </div>
            </div>

            {/* Barre de consommation */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">Réel vs Théorique</span>
                <span className={cn("font-bold", ecart > 0 ? "text-destructive" : "text-emerald-600")}>
                  {ecart >= 0 ? "+" : ""}{ecart.toFixed(0)} L ({ecartPct >= 0 ? "+" : ""}{ecartPct.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all",
                    isAlert ? "bg-destructive" : isMod ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(barPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Réel: {totalReel.toLocaleString("fr-FR")} L</span>
                <span>Théo: {totalTheorique.toLocaleString("fr-FR")} L</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
              <div className="text-center">
                <p className="text-xs font-bold text-foreground">{nbRotations}</p>
                <p className="text-[10px] text-muted-foreground">Rotations</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-foreground">{litresParRotation.toFixed(1)} L</p>
                <p className="text-[10px] text-muted-foreground">L/rotation</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-secondary">{formatCFA(totalCout)}</p>
                <p className="text-[10px] text-muted-foreground">Coût total</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}