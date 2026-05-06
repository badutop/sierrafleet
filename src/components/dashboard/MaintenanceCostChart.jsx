import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function MaintenanceCostChart({ maintenances }) {
  const data = useMemo(() => {
    const months = Array.from({ length: 5 }, (_, i) => {
      const d = subMonths(new Date(), 4 - i);
      return {
        month: format(d, "MMM yy", { locale: fr }),
        start: startOfMonth(d),
        end: endOfMonth(d),
        Préventive: 0,
        Corrective: 0,
      };
    });
    maintenances.forEach(m => {
      const d = new Date(m.date_entretien);
      const slot = months.find(mo => d >= mo.start && d <= mo.end);
      if (slot) {
        const cost = (m.cout || 0) + (m.cout_pieces || 0) + (m.cout_main_oeuvre || 0);
        if (m.categorie === "corrective") slot.Corrective += cost;
        else slot.Préventive += cost;
      }
    });
    return months.map(m => ({
      month: m.month.charAt(0).toUpperCase() + m.month.slice(1),
      Préventive: Math.round(m.Préventive),
      Corrective: Math.round(m.Corrective),
    }));
  }, [maintenances]);

  const formatK = (v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Coûts de maintenance</h3>
      <p className="text-xs text-muted-foreground mb-4">5 derniers mois — FCFA</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={formatK} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => [`${v.toLocaleString("fr-FR")} FCFA`, name]}
          />
          <Bar dataKey="Préventive" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Corrective" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}