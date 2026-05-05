import React from "react";
import { Fuel, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

const KpiBox = ({ icon: Icon, label, value, sub, color = "primary" }) => {
  const colors = {
    primary: "bg-primary/10 text-primary border-primary/20",
    orange: "bg-secondary/10 text-secondary border-secondary/20",
    red: "bg-destructive/10 text-destructive border-destructive/20",
    green: "bg-emerald-500/10 text-emerald-700 border-emerald-300/30",
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

export default function FuelKpiStrip({ totalMontant, totalLitres, avgPrix, alertCount, totalEcart, formatCFA }) {
  const ecartSign = totalEcart >= 0 ? "+" : "";
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiBox
        icon={DollarSign}
        label="Dépenses ce mois"
        value={formatCFA(totalMontant)}
        sub={`${totalLitres.toLocaleString("fr-FR")} litres consommés`}
        color="primary"
      />
      <KpiBox
        icon={Fuel}
        label="Prix moyen / litre"
        value={totalLitres > 0 ? formatCFA(avgPrix) : "—"}
        sub="Prix à la pompe moyen"
        color="orange"
      />
      <KpiBox
        icon={TrendingUp}
        label="Écart global (réel − théo.)"
        value={`${ecartSign}${totalEcart.toLocaleString("fr-FR")} L`}
        sub={totalEcart > 0 ? "Surconsommation" : totalEcart < 0 ? "Sous-consommation" : "Équilibré"}
        color={Math.abs(totalEcart) > 100 ? "red" : "green"}
      />
      <KpiBox
        icon={AlertTriangle}
        label="Véhicules en alerte"
        value={`${alertCount} véhicule${alertCount > 1 ? "s" : ""}`}
        sub="Écart > 15% (réel vs théorique)"
        color={alertCount > 0 ? "red" : "green"}
      />
    </div>
  );
}