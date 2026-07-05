import React from "react";
import { Activity, Shield, Users, Database } from "lucide-react";

export default function AuditStatCards({ logs, filteredCount }) {
  const actionTypes = new Set(logs.map(l => l.action)).size;
  const activeUsers = new Set(logs.map(l => l.user_email).filter(Boolean)).size;
  const entityTypes = new Set(logs.map(l => l.entity_name).filter(Boolean)).size;

  const cards = [
    { label: "Total des logs", value: filteredCount, sub: `sur ${logs.length} au total`, icon: Activity, color: "text-blue-600" },
    { label: "Types d'actions", value: actionTypes, sub: "différentes actions", icon: Shield, color: "text-emerald-600" },
    { label: "Utilisateurs actifs", value: activeUsers, sub: "utilisateurs distincts", icon: Users, color: "text-violet-600" },
    { label: "Types d'entités", value: entityTypes, sub: "types modifiés", icon: Database, color: "text-orange-600" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <c.icon className={`w-4 h-4 ${c.color}`} />
            <span className="text-2xl font-bold text-foreground">{c.value}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}