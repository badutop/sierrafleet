import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const TYPES = [
  { key: "carburant",     label: "Carburant",      color: "#f59e0b" },
  { key: "peage",         label: "Péage",           color: "#6366f1" },
  { key: "rations",       label: "Rations",         color: "#10b981" },
  { key: "contravention", label: "Contravention",   color: "#ef4444" },
  { key: "transport",     label: "Transport",       color: "#3b82f6" },
  { key: "autre",         label: "Autre",           color: "#94a3b8" },
];

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

export default function ExpenseBreakdownChart({ expenses }) {
  const data = useMemo(() => {
    const totals = {};
    expenses.forEach(e => {
      totals[e.type_frais] = (totals[e.type_frais] || 0) + (e.montant || 0);
    });
    return TYPES
      .map(t => ({ name: t.label, value: totals[t.key] || 0, color: t.color }))
      .filter(d => d.value > 0);
  }, [expenses]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length) return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-center h-full min-h-[200px]">
      <p className="text-xs text-muted-foreground">Aucune dépense enregistrée</p>
    </div>
  );

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Répartition des dépenses</h3>
      <p className="text-xs text-muted-foreground mb-3">Total : {fmt(total)} FCFA</p>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2} dataKey="value" strokeWidth={0}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
              formatter={(v, n) => [`${fmt(v)} FCFA`, n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
              <span className="text-xs font-medium text-card-foreground">{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}