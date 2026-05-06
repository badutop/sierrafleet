import React, { useMemo } from "react";
import { Truck, Wrench, AlertTriangle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels = {
  vidange: "Vidange", revision: "Révision", pneus: "Pneus", filtres: "Filtres",
  freins: "Freins", controle_technique: "CT", assurance: "Assurance",
  panne_moteur: "Panne moteur", panne_electricite: "Panne élec.",
  panne_transmission: "Panne transm.", carrosserie: "Carrosserie", autre: "Autre",
};

const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

export default function MaintenanceVehicleTab({ vehicles, maintenances, rotations }) {
  const data = useMemo(() => {
    return vehicles.map(vehicle => {
      const vMaints = maintenances.filter(m => m.vehicle_id === vehicle.id && m.statut === "realise");
      const vRotations = rotations.filter(r => r.vehicle_id === vehicle.id);
      const pannes = vMaints.filter(m => m.categorie === "corrective");
      const preventives = vMaints.filter(m => m.categorie === "preventive");
      const totalCout = vMaints.reduce((s, m) => s + (m.cout || 0), 0);
      const totalImmob = vMaints.reduce((s, m) => s + (m.duree_immobilisation_jours || 0), 0);
      const coutParRotation = vRotations.length > 0 ? totalCout / vRotations.length : 0;
      const enCours = maintenances.some(m => m.vehicle_id === vehicle.id && m.statut === "en_cours");

      // Top panne type
      const typeCount = {};
      pannes.forEach(m => { typeCount[m.type_entretien] = (typeCount[m.type_entretien] || 0) + 1; });
      const topPanne = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];

      return { vehicle, vMaints, pannes, preventives, totalCout, totalImmob, coutParRotation, enCours, topPanne, nbRotations: vRotations.length };
    }).filter(d => d.vMaints.length > 0 || d.enCours)
      .sort((a, b) => b.totalCout - a.totalCout);
  }, [vehicles, maintenances, rotations]);

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Aucune donnée — enregistrez des interventions pour voir les statistiques par camion.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {data.map(({ vehicle, pannes, preventives, totalCout, totalImmob, coutParRotation, enCours, topPanne, nbRotations }) => (
        <div key={vehicle.id} className={cn(
          "bg-card border rounded-xl p-4 space-y-3",
          enCours ? "border-amber-400/40" : pannes.length > 2 ? "border-destructive/30" : "border-border"
        )}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-sm font-mono">{vehicle.immatriculation}</span>
                {vehicle.code_camion && (
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">{vehicle.code_camion}</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{vehicle.marque} {vehicle.modele}</p>
            </div>
            {enCours && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-700">En maintenance</span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-destructive">{pannes.length}</p>
              <p className="text-[10px] text-muted-foreground">Pannes</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-primary">{preventives.length}</p>
              <p className="text-[10px] text-muted-foreground">Préventives</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-amber-600">{totalImmob}j</p>
              <p className="text-[10px] text-muted-foreground">Immobilisation</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-muted-foreground">{nbRotations}</p>
              <p className="text-[10px] text-muted-foreground">Rotations</p>
            </div>
          </div>

          {/* Coûts */}
          <div className="border-t border-border pt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Coût total</span>
              <span className="font-bold text-secondary">{formatCFA(totalCout)}</span>
            </div>
            {nbRotations > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Coût / rotation</span>
                <span className="font-medium">{formatCFA(coutParRotation)}</span>
              </div>
            )}
          </div>

          {/* Top panne */}
          {topPanne && (
            <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50/50 border border-amber-200/50 rounded-lg px-2 py-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Panne récurrente : <strong>{typeLabels[topPanne[0]] || topPanne[0]}</strong> ({topPanne[1]}x)</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}