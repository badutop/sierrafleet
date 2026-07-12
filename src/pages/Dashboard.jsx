import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import {
  Truck, Route, Fuel, Wrench, Users, TrendingUp, Activity,
  Package, AlertTriangle, CheckCircle2, BarChart3, ArrowUpRight, ArrowDownRight, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import QuickTripDialog from "@/components/triplog/QuickTripDialog";

// Dashboard components
import FleetStatusDonut      from "@/components/dashboard/FleetStatusDonut";
import FuelTrendChart        from "@/components/dashboard/FuelTrendChart";
import CampaignProgressChart from "@/components/dashboard/CampaignProgressChart";
import MaintenanceCostChart  from "@/components/dashboard/MaintenanceCostChart";
import RotationsTrendChart   from "@/components/dashboard/RotationsTrendChart";
import ExpenseBreakdownChart from "@/components/dashboard/ExpenseBreakdownChart";
import TruckPerformanceCard  from "@/components/dashboard/TruckPerformanceCard";
import DashboardAlerts       from "@/components/dashboard/DashboardAlerts";

const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
const fmt = (n) => n.toLocaleString("fr-FR");

function StatCard({ title, value, subtitle, icon: Icon, color, trend, trendLabel, className }) {
  const colorMap = {
    green:   { bg: "bg-emerald-500/10", card: "bg-emerald-50",  text: "text-emerald-600", bar: "bg-emerald-500" },
    blue:    { bg: "bg-blue-500/10",    card: "bg-blue-50",     text: "text-blue-600",    bar: "bg-blue-500" },
    orange:  { bg: "bg-amber-500/10",   card: "bg-amber-50",    text: "text-amber-600",   bar: "bg-amber-500" },
    red:     { bg: "bg-red-500/10",     card: "bg-red-50",      text: "text-red-600",     bar: "bg-red-500" },
    indigo:  { bg: "bg-indigo-500/10",  card: "bg-indigo-50",   text: "text-indigo-600",  bar: "bg-indigo-500" },
    primary: { bg: "bg-primary/10",     card: "bg-slate-50",    text: "text-primary",     bar: "bg-primary" },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <div className={`${c.card} rounded-xl border border-border p-5 hover:shadow-md transition-shadow group ${className || ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-lg font-semibold text-card-foreground truncate">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
      {trendLabel && <p className="text-[10px] text-muted-foreground/60 mt-1">{trendLabel}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [quickTripOpen, setQuickTripOpen] = useState(false);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_logs").select("*").order("date_depart", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
    enabled: vehicles.length > 0,
  });
  const { data: fuelEntries = [] } = useQuery({
    queryKey: ["fuel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fuel_entries").select("*").order("date", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
    enabled: vehicles.length > 0,
  });
  const { data: maintenances = [] } = useQuery({
    queryKey: ["maintenances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance").select("*").order("date_entretien", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
    enabled: vehicles.length > 0,
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("created_date", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotations").select("*").order("date_rotation", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("date_frais", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  // ── KPIs ──────────────────────────────────────────────────────────────
  const now       = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const prevYear  = thisMonth === 0 ? thisYear - 1 : thisYear;

  const isThisMonth = (d) => { const dt = new Date(d); return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear; };
  const isPrevMonth = (d) => { const dt = new Date(d); return dt.getMonth() === prevMonth && dt.getFullYear() === prevYear; };

  // Fleet
  const disponible     = vehicles.filter(v => v.statut === "disponible").length;
  const enMission      = vehicles.filter(v => v.statut === "en_mission").length;
  const enMaint        = vehicles.filter(v => v.statut === "en_maintenance").length;
  const horsService    = vehicles.filter(v => v.statut === "hors_service").length;
  const fleetRate      = vehicles.length ? Math.round(((disponible + enMission) / vehicles.length) * 100) : 0;

  // Fuel
  const fuelMonth  = fuelEntries.filter(f => isThisMonth(f.date));
  const fuelPrev   = fuelEntries.filter(f => isPrevMonth(f.date));
  const totalFuelCost  = fuelMonth.reduce((s, f) => s + (f.montant_total || 0), 0);
  const prevFuelCost   = fuelPrev.reduce((s, f)  => s + (f.montant_total || 0), 0);
  const fuelTrend      = prevFuelCost > 0 ? Math.round(((totalFuelCost - prevFuelCost) / prevFuelCost) * 100) : undefined;
  const totalLitres    = fuelMonth.reduce((s, f) => s + (f.litres || 0), 0);

  // Campaigns
  const activeCampaigns   = campaigns.filter(c => c.statut === "en_cours").length;
  const termineeCampaigns = campaigns.filter(c => c.statut === "terminee").length;

  // Rotations this month
  const rotMonth = rotations.filter(r => isThisMonth(r.date_rotation));
  const rotPrev  = rotations.filter(r => isPrevMonth(r.date_rotation));
  const rotTrend = rotPrev.length > 0 ? Math.round(((rotMonth.length - rotPrev.length) / rotPrev.length) * 100) : undefined;
  const tonnageMonth = rotMonth.reduce((s, r) => s + (r.poids_charge_tonnes || 0), 0);

  // Maintenance
  const maintMonth     = maintenances.filter(m => isThisMonth(m.date_entretien));
  const maintCostMonth = maintMonth.reduce((s, m) => s + (m.cout || 0) + (m.cout_pieces || 0) + (m.cout_main_oeuvre || 0), 0);

  // Expenses
  const expMonth = expenses.filter(e => isThisMonth(e.date_frais));
  const totalExp = expMonth.reduce((s, e) => s + (e.montant || 0), 0);

  // Recettes projetées (mois) — tonnage transporté x tarif client par tonne
  const clientById = Object.fromEntries(clients.map(c => [c.id, c]));
  const campaignById = Object.fromEntries(campaigns.map(c => [c.id, c]));
  const totalRecettes = rotMonth.reduce((s, r) => {
    const campaign = campaignById[r.campaign_id];
    const client = campaign ? clientById[campaign.client_id] : null;
    return s + (r.poids_charge_tonnes || 0) * (client?.tarif_par_tonne || 0);
  }, 0);

  // Résultat = recettes - (carburant + maintenance + autres dépenses)
  const totalDepenses = totalFuelCost + maintCostMonth + totalExp;
  const resultat = totalRecettes - totalDepenses;

  // Alerts
  const alerts = [];
  vehicles.forEach(v => {
    if (v.km_prochaine_vidange && v.km_actuel >= v.km_prochaine_vidange - 500)
      alerts.push({ type: "warning", severity: "critical", title: `Vidange ${v.immatriculation}`, message: `${v.km_prochaine_vidange - v.km_actuel} km restants` });
    if (v.date_assurance) {
      const days = Math.floor((new Date(v.date_assurance) - now) / 86400000);
      if (days <= 30) alerts.push({ type: "expiry", severity: days <= 0 ? "critical" : "warning", title: `Assurance ${v.immatriculation}`, message: days <= 0 ? "Expirée !" : `Expire dans ${days} j` });
    }
    if (v.date_visite_technique) {
      const days = Math.floor((new Date(v.date_visite_technique) - now) / 86400000);
      if (days <= 30) alerts.push({ type: "insurance", severity: days <= 0 ? "critical" : "warning", title: `Visite tech. ${v.immatriculation}`, message: days <= 0 ? "Expirée !" : `Expire dans ${days} j` });
    }
  });

  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vue d'ensemble opérationnelle — {monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground h-8 text-xs"
            onClick={() => setQuickTripOpen(true)}
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Nouveau trajet
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">Système actif</span>
          </div>
        </div>
      </div>

      {/* ── Row 2 : KPI opérationnels ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard title="Carburant (mois)"   value={formatCFA(totalFuelCost)} subtitle={`${fmt(Math.round(totalLitres))} L`} icon={Fuel} color="orange" trend={fuelTrend} className="col-span-2" />
        <StatCard title="Maintenance (mois)" value={formatCFA(maintCostMonth)} subtitle={`${maintMonth.length} intervention(s)`} icon={Wrench} color="red" className="col-span-2" />
        <StatCard title="Total Dépenses (mois)" value={formatCFA(totalExp)} subtitle={`${expMonth.length} dépense(s)`} icon={BarChart3} color="indigo" className="col-span-2" />
        <StatCard title="Résultat (mois)" value={formatCFA(resultat)} subtitle={`Recettes ${formatCFA(totalRecettes)}`} icon={TrendingUp} color="blue" className="col-span-2" />
      </div>

      {/* ── Row 3 : Flotte donut + Rotations trend + Fuel trend ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FleetStatusDonut   vehicles={vehicles} />
        <RotationsTrendChart rotations={rotations} />
        <FuelTrendChart      fuelEntries={fuelEntries} />
      </div>

      {/* ── Row 4 : Campagnes + Maintenance costs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CampaignProgressChart campaigns={campaigns} />
        <MaintenanceCostChart  maintenances={maintenances} />
      </div>

      {/* ── Row 5 : Dépenses breakdown + Top drivers + Alertes ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExpenseBreakdownChart expenses={expenses} />
        <TruckPerformanceCard  vehicles={vehicles} rotations={rotations} fuelEntries={fuelEntries} />
        <DashboardAlerts       alerts={alerts} />
      </div>

      <QuickTripDialog open={quickTripOpen} onClose={() => setQuickTripOpen(false)} />
    </div>
  );
}