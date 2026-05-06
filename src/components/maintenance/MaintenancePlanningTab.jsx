import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2, Wrench, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import MaintenanceValidationPanel from "./MaintenanceValidationPanel";

const today = new Date();

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
}

function UrgencyBadge({ days }) {
  if (days === null) return null;
  if (days < 0) return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">En retard ({Math.abs(days)}j)</Badge>;
  if (days <= 7) return <Badge className="bg-red-500/15 text-red-700 border-red-400/30 text-[10px]">Urgent ({days}j)</Badge>;
  if (days <= 30) return <Badge className="bg-amber-500/15 text-amber-700 border-amber-400/30 text-[10px]">Bientôt ({days}j)</Badge>;
  return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-400/30 text-[10px]">OK ({days}j)</Badge>;
}

export default function MaintenancePlanningTab({ maintenances, vehicles, rotations, onStatusChange, isPending }) {
  const rotationsByVehicle = useMemo(() => {
    const map = {};
    rotations.forEach(r => { map[r.vehicle_id] = (map[r.vehicle_id] || 0) + 1; });
    return map;
  }, [rotations]);

  const vMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);

  // Construire les alertes de planning
  const alerts = useMemo(() => {
    const result = [];

    // Maintenances planifiées avec prochaine_date
    const planifiees = maintenances.filter(m => m.prochaine_date && m.statut !== "annule");
    planifiees.forEach(m => {
      const days = daysUntil(m.prochaine_date);
      if (days !== null && days <= 30) {
        result.push({ type: "date", days, maintenance: m, vehicle: vMap[m.vehicle_id] });
      }
    });

    // Alertes par kilométrage
    vehicles.forEach(vehicle => {
      const lastMaint = maintenances
        .filter(m => m.vehicle_id === vehicle.id && m.prochain_km && m.statut === "realise")
        .sort((a, b) => new Date(b.date_entretien) - new Date(a.date_entretien))[0];
      if (lastMaint && vehicle.km_actuel && lastMaint.prochain_km) {
        const kmRestant = lastMaint.prochain_km - vehicle.km_actuel;
        if (kmRestant < 2000) {
          result.push({ type: "km", kmRestant, maintenance: lastMaint, vehicle });
        }
      }
    });

    // Alertes par nombre de rotations
    maintenances.filter(m => m.prochain_nb_rotations && m.statut === "realise").forEach(m => {
      const currentRots = rotationsByVehicle[m.vehicle_id] || 0;
      const km_rots = m.prochain_nb_rotations;
      if (currentRots >= km_rots * 0.85) {
        result.push({ type: "rotation", currentRots, seuilRots: km_rots, maintenance: m, vehicle: vMap[m.vehicle_id] });
      }
    });

    return result.sort((a, b) => (a.days || 0) - (b.days || 0));
  }, [maintenances, vehicles, rotationsByVehicle, vMap]);

  const futurePlanifiees = maintenances
    .filter(m => m.statut === "planifie")
    .sort((a, b) => new Date(a.date_entretien) - new Date(b.date_entretien));

  return (
    <div className="space-y-6">
      {/* Alertes urgentes */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Alertes de maintenance ({alerts.length})
        </h3>
        {alerts.length === 0 ? (
          <div className="text-center py-10 text-emerald-700 bg-emerald-50/50 border border-emerald-200/50 rounded-xl">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">Aucune maintenance urgente</p>
            <p className="text-xs text-muted-foreground mt-1">Tous les véhicules sont dans les délais.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const v = alert.vehicle;
              return (
                <div key={i} className={cn(
                  "border rounded-xl p-4 flex items-start gap-3",
                  alert.type === "km" || (alert.days !== undefined && alert.days < 0)
                    ? "border-destructive/40 bg-destructive/5"
                    : alert.days !== undefined && alert.days <= 7
                    ? "border-red-400/40 bg-red-50/50"
                    : "border-amber-400/40 bg-amber-50/50"
                )}>
                  <Wrench className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {v?.code_camion ? `[${v.code_camion}] ` : ""}{v?.immatriculation || "Véhicule inconnu"}
                      </span>
                      {alert.type === "date" && <UrgencyBadge days={alert.days} />}
                      {alert.type === "km" && (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
                          Km : {alert.kmRestant < 0 ? "Dépassé" : `${alert.kmRestant.toLocaleString()} km restants`}
                        </Badge>
                      )}
                      {alert.type === "rotation" && (
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-400/30 text-[10px]">
                          Rotations : {alert.currentRots}/{alert.seuilRots}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.maintenance.designation || alert.maintenance.type_entretien}
                      {alert.type === "date" && alert.maintenance.prochaine_date && ` — Prévu le ${new Date(alert.maintenance.prochaine_date).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Maintenances planifiées à venir */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Interventions planifiées ({futurePlanifiees.length})
        </h3>
        {futurePlanifiees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune intervention planifiée.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {futurePlanifiees.map(m => {
              const vehicle = vMap[m.vehicle_id];
              const days = daysUntil(m.date_entretien);
              return (
                <div key={m.id} className="border border-border rounded-xl bg-card overflow-hidden">
                  {/* En-tête carte */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                    <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-sm font-bold">
                      {vehicle?.code_camion ? `[${vehicle.code_camion}] ` : ""}{vehicle?.immatriculation || "—"}
                    </span>
                    <div className="ml-auto">
                      {days !== null && <UrgencyBadge days={days} />}
                    </div>
                  </div>
                  {/* Date + prestataire */}
                  <div className="px-4 py-2 text-xs text-muted-foreground flex justify-between">
                    <span>{m.date_entretien ? new Date(m.date_entretien).toLocaleDateString("fr-FR") : "—"}</span>
                    <span>{m.prestataire || "Prestataire non défini"}</span>
                  </div>
                  {/* Panneau de validation */}
                  <div className="px-3 pb-3">
                    <MaintenanceValidationPanel
                      maintenance={m}
                      onStatusChange={onStatusChange}
                      isPending={isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}