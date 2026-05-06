import React from "react";
import { Wrench, AlertTriangle, CheckCircle2, TrendingDown, Clock } from "lucide-react";

const KpiBox = ({ icon: IconComp, label, value, sub, color = "primary" }) => {
  const Icon = IconComp;
  const colors = {
    primary: "bg-primary/10 text-primary border-primary/20",
    orange: "bg-secondary/10 text-secondary border-secondary/20",
    red: "bg-destructive/10 text-destructive border-destructive/20",
    green: "bg-emerald-500/10 text-emerald-700 border-emerald-300/30",
    amber: "bg-amber-500/10 text-amber-700 border-amber-300/30",
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colors[color]}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium opacity-70">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        {sub && <p className="text-[11px] opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

export default function MaintenanceKpiStrip({ maintenances, vehicles, rotations }) {
  const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

  const totalCout = maintenances.reduce((s, m) => s + (m.cout || 0), 0);
  const pannes = maintenances.filter(m => m.categorie === "corrective");
  const planifiees = maintenances.filter(m => m.statut === "planifie");
  const enCours = maintenances.filter(m => m.statut === "en_cours");

  // Taux de disponibilité = véhicules non immobilisés / total
  const vehiclesEnMaint = new Set(enCours.map(m => m.vehicle_id)).size;
  const tauxDispo = vehicles.length > 0
    ? (((vehicles.length - vehiclesEnMaint) / vehicles.length) * 100).toFixed(0)
    : 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiBox icon={TrendingDown} label="Coût total maintenance" value={formatCFA(totalCout)} sub={`${maintenances.length} interventions`} color="primary" />
      <KpiBox icon={Wrench} label="Pannes / Réparations" value={pannes.length} sub="Interventions correctives" color="orange" />
      <KpiBox icon={Clock} label="Planifiées" value={planifiees.length} sub="À venir" color="amber" />
      <KpiBox icon={AlertTriangle} label="En cours" value={enCours.length} sub={`${vehiclesEnMaint} véhicule(s) immobilisé(s)`} color={enCours.length > 0 ? "red" : "green"} />
      <KpiBox icon={CheckCircle2} label="Disponibilité flotte" value={`${tauxDispo}%`} sub={`${vehicles.length - vehiclesEnMaint}/${vehicles.length} véhicules actifs`} color={tauxDispo >= 80 ? "green" : "red"} />
    </div>
  );
}