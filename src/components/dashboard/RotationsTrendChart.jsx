import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

export default function RotationsTrendChart({ rotations }) {
  const data = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return {
        day: format(d, "dd/MM"),
        dateStr: format(d, "yyyy-MM-dd"),
        Rotations: 0,
      };
    });
    rotations.forEach(r => {
      const dateStr = r.date_rotation ? r.date_rotation.slice(0, 10) : null;
      const slot = days.find(d => d.dateStr === dateStr);
      if (slot) slot.Rotations += 1;
    });
    return days;
  }, [rotations]);

  const avg = data.length ? Math.round(data.reduce((s, d) => s + d.Rotations, 0) / data.length) : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-card-foreground">Rotations quotidiennes</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">moy. {avg}/j</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">14 derniers jours</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={1} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [v, "Rotations"]}
          />
          {avg > 0 && <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: "Moy.", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }} />}
          <Line type="monotone" dataKey="Rotations" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}