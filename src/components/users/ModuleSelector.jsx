import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const ALL_MODULES = [
  { key: "dashboard",    label: "Tableau de bord" },
  { key: "campaigns",    label: "Campagnes" },
  { key: "vehicles",     label: "Véhicules" },
  { key: "drivers",      label: "Chauffeurs" },
  { key: "fuel",         label: "Carburant" },
  { key: "refuel",       label: "Rechargement Auto (Chauffeur)" },
  { key: "maintenance",  label: "Maintenance" },
  { key: "expenses",     label: "Dépenses" },
  { key: "spare-parts",  label: "Pièces détachées" },
  { key: "suppliers",    label: "Fournisseurs" },
  { key: "journal",      label: "Journal de bord" },
  { key: "reports",      label: "Rapports & Analytique" },
  { key: "deversement",  label: "Déversement comptable" },
  { key: "gps",          label: "Suivi GPS" },
  { key: "users",        label: "Utilisateurs" },
  { key: "settings",     label: "Paramètres" },
];

/**
 * Props:
 *   selected: string[]  — modules cochés
 *   onChange: (modules: string[]) => void
 */
export default function ModuleSelector({ selected = [], onChange }) {
  const toggle = (key) => {
    if (selected.includes(key)) {
      onChange(selected.filter(k => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const allChecked = ALL_MODULES.every(m => selected.includes(m.key));
  const toggleAll = () => onChange(allChecked ? [] : ALL_MODULES.map(m => m.key));

  return (
    <div className="space-y-2">
      {/* Tout cocher */}
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Checkbox id="all-modules" checked={allChecked} onCheckedChange={toggleAll} />
        <Label htmlFor="all-modules" className="text-xs font-semibold cursor-pointer">Tous les modules</Label>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {ALL_MODULES.map(m => (
          <div key={m.key} className="flex items-center gap-2">
            <Checkbox
              id={`mod-${m.key}`}
              checked={selected.includes(m.key)}
              onCheckedChange={() => toggle(m.key)}
            />
            <Label htmlFor={`mod-${m.key}`} className="text-xs cursor-pointer">{m.label}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}