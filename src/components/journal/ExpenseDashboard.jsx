import React, { useMemo } from "react";
import { TrendingUp, Fuel, BarChart3, AlertTriangle, Utensils, Truck } from "lucide-react";

const TYPE_CONFIG = {
  carburant:      { label: "Carburant",       color: "bg-blue-500/15 text-blue-700 border-blue-400/20",    icon: Fuel },
  peage:          { label: "Péage",            color: "bg-purple-500/15 text-purple-700 border-purple-400/20", icon: BarChart3 },
  rations:        { label: "Rations",          color: "bg-emerald-500/15 text-emerald-700 border-emerald-400/20", icon: Utensils },
  contravention:  { label: "Contraventions",   color: "bg-destructive/15 text-destructive border-destructive/20", icon: AlertTriangle },
  transport:      { label: "Transport",        color: "bg-amber-500/15 text-amber-700 border-amber-400/20",  icon: Truck },
  autre:          { label: "Autre",            color: "bg-muted text-muted-foreground border-border",        icon: BarChart3 },
};

const fmt = n => new Intl.NumberFormat("fr-FR").format(Math.round(n));

export default function ExpenseDashboard({ expenses, filterYear, filterMonth }) {
  const { total, byType, maxType } = useMemo(() => {
    const byType = {};
    let total = 0;
    expenses.forEach(e => {
      const t = e.type_frais || "autre";
      byType[t] = (byType[t] || 0) + (e.montant || 0);
      total += e.montant || 0;
    });
    const maxType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { total, byType, maxType };
  }, [expenses]);

  const periodLabel = filterMonth === "all"
    ? `Année ${filterYear}`
    : `${["","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"][parseInt(filterMonth)]} ${filterYear}`;

  return (
    <div className="space-y-3">
      {/* Total card */}
      <div className="bg-primary rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-primary-foreground/70 uppercase tracking-wide font-medium">Total dépenses — {periodLabel}</p>
          <p className="text-3xl font-bold text-primary-foreground mt-1">{fmt(total)} <span className="text-base font-normal opacity-70">FCFA</span></p>
          <p className="text-xs text-primary-foreground/60 mt-1">{expenses.length} transaction(s)</p>
        </div>
        <TrendingUp className="w-12 h-12 text-primary-foreground/20 shrink-0 hidden sm:block" />
      </div>

      {/* By type grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const amount = byType[key] || 0;
          const pct = total > 0 ? Math.round(amount / total * 100) : 0;
          return (
            <div key={key} className={`rounded-xl border px-4 py-3 flex flex-col gap-1 ${cfg.color}`}>
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 opacity-70" />
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{cfg.label}</span>
              </div>
              <p className="text-lg font-bold leading-tight">{fmt(amount)}</p>
              <p className="text-[10px] opacity-60">FCFA · {pct}%</p>
              {/* mini bar */}
              <div className="h-1 rounded-full bg-black/10 mt-1">
                <div className="h-1 rounded-full bg-current opacity-50" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}