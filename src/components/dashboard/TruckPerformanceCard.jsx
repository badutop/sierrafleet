import React from "react";
import { Truck, TrendingUp } from "lucide-react";

export default function TruckPerformanceCard({ vehicles, rotations, fuelEntries }) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const stats = {};
  rotations.forEach(r => {
    const d = new Date(r.date_rotation);
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear && r.vehicle_id) {
      if (!stats[r.vehicle_id]) stats[r.vehicle_id] = { rotations: 0, litres: 0 };
      stats[r.vehicle_id].rotations += 1;
    }
  });
  fuelEntries.forEach(f => {
    const d = new Date(f.date);
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear && f.vehicle_id) {
      if (!stats[f.vehicle_id]) stats[f.vehicle_id] = { rotations: 0, litres: 0 };
      stats[f.vehicle_id].litres += f.litres || 0;
    }
  });

  const top = Object.entries(stats)
    .sort((a, b) => b[1].rotations - a[1].rotations)
    .slice(0, 5)
    .map(([id, s]) => {
      const v = vehicles.find(vh => vh.id === id);
      return { name: v ? v.immatriculation : "—", ...s };
    });

  const maxRot = top[0]?.rotations || 1;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <Truck className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Performance camions</h3>
          <p className="text-xs text-muted-foreground">Ce mois-ci — rotations & carburant</p>
        </div>
      </div>

      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Aucune rotation ce mois</p>
      ) : (
        <div className="space-y-3">
          {top.map((v, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: i === 0 ? "#f59e0b22" : "hsl(var(--muted))", color: i === 0 ? "#f59e0b" : "hsl(var(--muted-foreground))" }}>
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium text-card-foreground truncate max-w-[100px]">{v.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{Math.round(v.litres)} L</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-semibold text-card-foreground">{v.rotations}</span>
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(v.rotations / maxRot) * 100}%`, background: i === 0 ? "#f59e0b" : "#3b82f6" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}