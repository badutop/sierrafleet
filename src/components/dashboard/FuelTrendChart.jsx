import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function FuelTrendChart({ fuelEntries }) {
  const data = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        month: format(d, "MMM", { locale: fr }),
        start: startOfMonth(d),
        end: endOfMonth(d),
        litres: 0,
        cout: 0,
      };
    });
    fuelEntries.forEach(f => {
      const d = new Date(f.date);
      const slot = months.find(m => d >= m.start && d <= m.end);
      if (slot) {
        slot.litres += f.litres || 0;
        slot.cout += f.montant_total || 0;
      }
    });
    return months.map(m => ({
      month: m.month.charAt(0).toUpperCase() + m.month.slice(1),
      Litres: Math.round(m.litres),
      "Coût (FCFA)": Math.round(m.cout),
    }));
  }, [fuelEntries]);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Consommation carburant</h3>
      <p className="text-xs text-muted-foreground mb-4">6 derniers mois — litres</p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradFuel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            formatter={(val) => [`${val.toLocaleString("fr-FR")} L`, "Litres"]}
          />
          <Area type="monotone" dataKey="Litres" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gradFuel)" dot={{ r: 3, fill: "#f59e0b" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}