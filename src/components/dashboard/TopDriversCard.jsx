import React from "react";
import { Users, TrendingUp } from "lucide-react";

export default function TopDriversCard({ drivers, rotations, campaigns }) {
  // Count rotations per driver this month
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const stats = {};
  rotations.forEach(r => {
    const d = new Date(r.date_rotation);
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear && r.driver_id) {
      if (!stats[r.driver_id]) stats[r.driver_id] = { rotations: 0, tonnage: 0 };
      stats[r.driver_id].rotations += 1;
      stats[r.driver_id].tonnage += r.poids_charge_tonnes || 0;
    }
  });

  const top = Object.entries(stats)
    .sort((a, b) => b[1].rotations - a[1].rotations)
    .slice(0, 5)
    .map(([id, s]) => {
      const d = drivers.find(dr => dr.id === id);
      return { name: d ? `${d.prenom} ${d.nom}` : "—", ...s };
    });

  const maxRot = top[0]?.rotations || 1;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Top chauffeurs</h3>
          <p className="text-xs text-muted-foreground">Ce mois-ci — rotations</p>
        </div>
      </div>

      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Aucune rotation ce mois</p>
      ) : (
        <div className="space-y-3">
          {top.map((d, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: i === 0 ? "#f59e0b22" : "hsl(var(--muted))", color: i === 0 ? "#f59e0b" : "hsl(var(--muted-foreground))" }}>
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium text-card-foreground truncate max-w-[120px]">{d.name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-semibold text-card-foreground">{d.rotations}</span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(d.rotations / maxRot) * 100}%`, background: i === 0 ? "#f59e0b" : "#3b82f6" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}