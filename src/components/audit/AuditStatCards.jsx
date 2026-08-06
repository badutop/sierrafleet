import React from "react";
import { Activity, Shield, Users, Database } from "lucide-react";

export default function AuditStatCards({ logs, filteredCount }) {
  const actionTypes = new Set(logs.map(l => l.action)).size;
  const activeUsers = new Set(logs.map(l => l.user_email).filter(Boolean)).size;
  const entityTypes = new Set(logs.map(l => l.entity_name).filter(Boolean)).size;

  const cards = [
    { label: "Total des logs", value: filteredCount, sub: `sur ${logs.length} au total`, icon: Activity, color: "text-blue-700", card: "bg-blue-500/15" },
    { label: "Types d'actions", value: actionTypes, sub: "différentes actions", icon: Shield, color: "text-emerald-700", card: "bg-emerald-500/15" },
    { label: "Utilisateurs actifs", value: activeUsers, sub: "utilisateurs distincts", icon: Users, color: "text-violet-700", card: "bg-violet-500/15" },
    { label: "Types d'entités", value: entityTypes, sub: "types modifiés", icon: Database, color: "text-orange-700", card: "bg-orange-500/15" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className={`border border-sidebar rounded-xl p-4 ${c.card}`}>
          <p className={`text-xs opacity-80 ${c.color}`}>{c.label}</p>
          <div className={`flex items-center gap-2 mt-1.5 ${c.color}`}>
            <c.icon className="w-4 h-4" />
            <span className="text-2xl font-bold">{c.value}</span>
          </div>
          <p className={`text-[11px] mt-1 opacity-70 ${c.color}`}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}