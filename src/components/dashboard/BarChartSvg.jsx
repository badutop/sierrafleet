import React from "react";

export default function BarChartSvg({ data, title }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(40, (280 / data.length));
  const chartH = 160;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">{title}</h3>
      <svg viewBox={`0 0 ${data.length * (barWidth + 12) + 20} ${chartH + 40}`} className="w-full h-48">
        {data.map((d, i) => {
          const h = (d.value / maxVal) * chartH;
          const x = 10 + i * (barWidth + 12);
          const y = chartH - h + 5;
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barWidth} height={h}
                rx={4}
                fill={d.color || "hsl(25, 92%, 54%)"}
                className="opacity-80 hover:opacity-100 transition-opacity"
              />
              <text x={x + barWidth/2} y={chartH + 18} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {d.label}
              </text>
              <text x={x + barWidth/2} y={y - 4} textAnchor="middle" className="fill-card-foreground text-[9px] font-medium">
                {d.value > 0 ? Math.round(d.value) : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}