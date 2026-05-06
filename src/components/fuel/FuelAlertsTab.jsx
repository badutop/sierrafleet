import React, { useMemo } from "react";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, TrendingUp, Fuel } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SEUIL_ALERTE = 15;  // % écart pour alerte rouge
const SEUIL_MOD = 5;      // % écart pour alerte jaune

function AlertCard({ icon: IconComp, level, title, description, value, sub }) {
  const Icon = IconComp;
  const styles = {
    danger: "border-destructive/40 bg-destructive/5 text-destructive",
    warning: "border-amber-400/40 bg-amber-50/50 text-amber-700",
    info: "border-blue-400/40 bg-blue-50/50 text-blue-700",
    ok: "border-emerald-400/40 bg-emerald-50/50 text-emerald-700",
  };
  return (
    <div className={cn("border rounded-xl p-4 flex items-start gap-3", styles[level])}>
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{title}</p>
          {value && <span className="text-xs font-bold shrink-0">{value}</span>}
        </div>
        <p className="text-xs opacity-80 mt-0.5">{description}</p>
        {sub && <p className="text-[11px] opacity-60 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function FuelAlertsTab({ vehicles, rotations, entries, campaigns, clients, formatCFA }) {
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);
  const campaignMap = useMemo(() => Object.fromEntries(campaigns.map(c => [c.id, c])), [campaigns]);

  const alerts = useMemo(() => {
    const result = [];

    // Analyse par véhicule
    vehicles.forEach(vehicle => {
      const vRotations = rotations.filter(r => r.vehicle_id === vehicle.id);
      const vEntries = entries.filter(e => e.vehicle_id === vehicle.id);
      if (vRotations.length === 0 && vEntries.length === 0) return;

      const theorique = vRotations.reduce((s, r) => s + (r.litres_carburant_alloues || 0), 0);
      const reel = vEntries.reduce((s, e) => s + (e.litres || 0), 0);
      const ecart = reel - theorique;
      const ecartPct = theorique > 0 ? (ecart / theorique) * 100 : 0;

      if (Math.abs(ecartPct) > SEUIL_ALERTE) {
        result.push({
          level: "danger",
          icon: AlertCircle,
          title: `Surconsommation critique — ${vehicle.immatriculation}`,
          description: `Écart de +${ecartPct.toFixed(1)}% entre la consommation réelle et théorique. Vérifiez les enregistrements manuels et les fuites éventuelles.`,
          value: `+${ecart.toFixed(0)} L`,
          sub: `Théorique: ${theorique.toFixed(0)} L · Réel: ${reel.toFixed(0)} L`,
          sortKey: Math.abs(ecartPct),
        });
      } else if (Math.abs(ecartPct) > SEUIL_MOD) {
        result.push({
          level: "warning",
          icon: AlertTriangle,
          title: `Écart modéré — ${vehicle.immatriculation}`,
          description: `Écart de ${ecartPct >= 0 ? "+" : ""}${ecartPct.toFixed(1)}% détecté. Surveillance recommandée.`,
          value: `${ecart >= 0 ? "+" : ""}${ecart.toFixed(0)} L`,
          sub: `Théorique: ${theorique.toFixed(0)} L · Réel: ${reel.toFixed(0)} L`,
          sortKey: Math.abs(ecartPct),
        });
      }
    });

    // Refuels sans prix (données manquantes)
    const missingPrix = entries.filter(e => !e.station?.startsWith("Refuel auto") && (!e.prix_litre || e.prix_litre === 0));
    if (missingPrix.length > 0) {
      result.push({
        level: "info",
        icon: Info,
        title: `Données incomplètes — Prix manquants`,
        description: `${missingPrix.length} approvisionnement(s) sans prix au litre. Les calculs de coût sont incomplets.`,
        value: `${missingPrix.length} entr.`,
        sortKey: 0,
      });
    }

    // Véhicules actifs sans refuel récent (> 7 jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    vehicles.forEach(vehicle => {
      const vEntries = entries.filter(e => e.vehicle_id === vehicle.id);
      if (vEntries.length === 0) return;
      const lastDate = vEntries.map(e => new Date(e.date)).sort((a, b) => b - a)[0];
      const vRotations = rotations.filter(r => r.vehicle_id === vehicle.id);
      if (lastDate < sevenDaysAgo && vRotations.length > 0) {
        result.push({
          level: "info",
          icon: Fuel,
          title: `Aucun refuel récent — ${vehicle.immatriculation}`,
          description: `Dernier approvisionnement il y a plus de 7 jours (${lastDate.toLocaleDateString("fr-FR")}). Ce véhicule est actif.`,
          value: null,
          sortKey: -1,
        });
      }
    });

    return result.sort((a, b) => b.sortKey - a.sortKey);
  }, [vehicles, rotations, entries, campaigns, clients]);

  const dangerCount = alerts.filter(a => a.level === "danger").length;
  const warningCount = alerts.filter(a => a.level === "warning").length;

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3">
        <div className={cn("rounded-xl border p-3 text-center", dangerCount > 0 ? "border-destructive/40 bg-destructive/5" : "border-border")}>
          <p className={cn("text-2xl font-bold", dangerCount > 0 ? "text-destructive" : "text-muted-foreground")}>{dangerCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Alertes critiques</p>
        </div>
        <div className={cn("rounded-xl border p-3 text-center", warningCount > 0 ? "border-amber-400/40 bg-amber-50/50" : "border-border")}>
          <p className={cn("text-2xl font-bold", warningCount > 0 ? "text-amber-700" : "text-muted-foreground")}>{warningCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Avertissements</p>
        </div>
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-50/50 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{vehicles.length - dangerCount - warningCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Véhicules OK</p>
        </div>
      </div>

      {/* Liste des alertes */}
      {alerts.length === 0 ? (
        <div className="text-center py-16 text-emerald-700">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">Aucune anomalie détectée</p>
          <p className="text-xs text-muted-foreground mt-1">Tous les véhicules sont dans les normes de consommation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <AlertCard key={i} {...alert} />
          ))}
        </div>
      )}
    </div>
  );
}