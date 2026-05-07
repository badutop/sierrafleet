import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name} :</span>
          <span className="font-medium">
            {p.dataKey === "cout" ? formatCFA(p.value) + " FCFA" : Math.round(p.value) + " L"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function FuelMonthlyChart({ entries }) {
  const monthlyData = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!e.date) return;
      const key = e.date.slice(0, 7); // YYYY-MM
      if (!map[key]) map[key] = { key, litres: 0, cout: 0 };
      map[key].litres += e.litres || 0;
      map[key].cout += e.montant_total || 0;
    });

    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12) // 12 derniers mois max
      .map(d => ({
        ...d,
        label: format(parseISO(d.key + "-01"), "MMM yy", { locale: fr }),
      }));
  }, [entries]);

  if (monthlyData.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Pas encore de données mensuelles à afficher.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-secondary" />
          Évolution mensuelle — Dépenses &amp; Volumes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="cout"
              orientation="left"
              tickFormatter={v => formatCFA(v)}
              tick={{ fontSize: 10 }}
              width={72}
            />
            <YAxis
              yAxisId="litres"
              orientation="right"
              tickFormatter={v => v + " L"}
              tick={{ fontSize: 10 }}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="cout"
              dataKey="cout"
              name="Coût (FCFA)"
              fill="hsl(var(--secondary))"
              radius={[3, 3, 0, 0]}
              maxBarSize={48}
            />
            <Line
              yAxisId="litres"
              type="monotone"
              dataKey="litres"
              name="Volume (L)"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}