import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Aligné sur le vrai vocabulaire de statut (CampaignsList.jsx) — voir
// CampaignDetail.jsx pour le contexte du fix. "validee_responsable"/
// "validee_operationnel" retirés : jamais déclenchés par aucun bouton.
const STATUS_COLORS = {
  creee: "#6366f1",
  en_cours: "#3b82f6",
  terminee: "#10b981",
  clôturée: "#94a3b8",
};

export default function CampaignProgressChart({ campaigns }) {
  if (!campaigns.length) return null;

  // Show last 6 campaigns with progress %
  const data = campaigns.slice(0, 6).map(c => {
    const pct = c.tonnage_total_prevu > 0
      ? Math.min(100, Math.round((c.tonnage_realise / c.tonnage_total_prevu) * 100))
      : 0;
    return {
      name: (c.nom_campagne || c.reference || "—").slice(0, 12),
      Réalisé: pct,
      Restant: 100 - pct,
      statut: c.statut,
      rotations: c.nombre_rotations_realisees || 0,
      prevues: c.nombre_rotations_prevues || 0,
    };
  });

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-card-foreground mb-1">Avancement des campagnes</h3>
      <p className="text-xs text-muted-foreground mb-4">% tonnage réalisé vs prévu</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={72} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            formatter={(val, name, props) => {
              if (name === "Réalisé") return [`${val}%`, "Réalisé"];
              return null;
            }}
          />
          <Bar dataKey="Réalisé" stackId="a" radius={[0, 0, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={STATUS_COLORS[entry.statut] || "#3b82f6"} />
            ))}
          </Bar>
          <Bar dataKey="Restant" stackId="a" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries({ "Créée": "#6366f1", "Démarrée": "#3b82f6", "Terminée": "#10b981", "Clôturée": "#94a3b8" }).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
            <span className="text-[10px] text-muted-foreground">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}