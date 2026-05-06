import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const STATUTS = [
  { key: "disponible",     label: "Disponible",  color: "#10b981" },
  { key: "en_mission",     label: "En mission",  color: "#3b82f6" },
  { key: "en_maintenance", label: "Maintenance", color: "#f59e0b" },
  { key: "hors_service",   label: "Hors service",color: "#ef4444" },
];

export default function FleetStatusDonut({ vehicles }) {
  const data = STATUTS
    .map(s => ({ name: s.label, value: vehicles.filter(v => v.statut === s.key).length, color: s.color }))
    .filter(d => d.value > 0);

  const total = vehicles.length;

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">État de la flotte</h3>
      <p className="text-xs text-muted-foreground mb-4">{total} véhicule{total > 1 ? "s" : ""} au total</p>
      <div className="relative flex-1" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val, name) => [`${val} véhicule${val > 1 ? "s" : ""}`, name]}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-card-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">véhicules</span>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-muted-foreground">{d.name}</span>
            <span className="ml-auto text-xs font-semibold text-card-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}