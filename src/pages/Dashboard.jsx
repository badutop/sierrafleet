import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Truck, Route, Fuel, Wrench, Users, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import BarChartSvg from "@/components/dashboard/BarChartSvg";
import AlertsList from "@/components/dashboard/AlertsList";
import { demoVehicles, demoDrivers, generateDemoTrips, generateDemoFuel, generateDemoMaintenance } from "@/lib/demoData";

export default function Dashboard() {
  const [seeded, setSeeded] = useState(false);

  const { data: vehicles = [], refetch: refetchV } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });
  const { data: drivers = [], refetch: refetchD } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.list(),
  });
  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: () => base44.entities.TripLog.list("-date_depart", 100),
    enabled: seeded || vehicles.length > 0,
  });
  const { data: fuelEntries = [] } = useQuery({
    queryKey: ["fuel"],
    queryFn: () => base44.entities.FuelEntry.list("-date", 100),
    enabled: seeded || vehicles.length > 0,
  });
  const { data: maintenances = [] } = useQuery({
    queryKey: ["maintenances"],
    queryFn: () => base44.entities.Maintenance.list("-date_entretien", 50),
    enabled: seeded || vehicles.length > 0,
  });

  // Seed demo data if empty
  useEffect(() => {
    async function seed() {
      if (vehicles.length === 0 && !seeded) {
        const createdVehicles = await base44.entities.Vehicle.bulkCreate(demoVehicles);
        const createdDrivers = await base44.entities.Driver.bulkCreate(demoDrivers);
        const vIds = createdVehicles.map(v => v.id);
        const dIds = createdDrivers.map(d => d.id);
        await base44.entities.TripLog.bulkCreate(generateDemoTrips(vIds, dIds));
        await base44.entities.FuelEntry.bulkCreate(generateDemoFuel(vIds));
        await base44.entities.Maintenance.bulkCreate(generateDemoMaintenance(vIds));
        setSeeded(true);
        refetchV();
        refetchD();
      }
    }
    seed();
  }, [vehicles.length]);

  // KPI calculations
  const active = vehicles.filter(v => v.statut === "disponible").length;
  const enMission = vehicles.filter(v => v.statut === "en_mission").length;
  const enMaint = vehicles.filter(v => v.statut === "en_maintenance").length;
  const horsService = vehicles.filter(v => v.statut === "hors_service").length;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthTrips = trips.filter(t => { const d = new Date(t.date_depart); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const totalKmMonth = monthTrips.reduce((s, t) => s + (t.km_parcourus || 0), 0);
  const monthFuel = fuelEntries.filter(f => { const d = new Date(f.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const totalFuelCost = monthFuel.reduce((s, f) => s + (f.montant_total || 0), 0);
  const fleetRate = vehicles.length ? Math.round(((active + enMission) / vehicles.length) * 100) : 0;

  // Fuel per vehicle chart data
  const fuelByVehicle = {};
  const last7 = new Date(); last7.setDate(last7.getDate() - 7);
  fuelEntries.filter(f => new Date(f.date) >= last7).forEach(f => {
    const v = vehicles.find(vv => vv.id === f.vehicle_id);
    const label = v ? v.immatriculation.split("-")[1] : "?";
    fuelByVehicle[label] = (fuelByVehicle[label] || 0) + (f.litres || 0);
  });
  const fuelChartData = Object.entries(fuelByVehicle).map(([label, value]) => ({ label, value }));

  // Alerts
  const alerts = [];
  vehicles.forEach(v => {
    if (v.km_prochaine_vidange && v.km_actuel >= v.km_prochaine_vidange - 500) {
      alerts.push({ type: "warning", severity: "critical", title: `Vidange ${v.immatriculation}`, message: `${v.km_prochaine_vidange - v.km_actuel} km restants` });
    }
    if (v.date_assurance) {
      const days = Math.floor((new Date(v.date_assurance) - now) / 86400000);
      if (days <= 30) alerts.push({ type: "expiry", severity: days <= 0 ? "critical" : "warning", title: `Assurance ${v.immatriculation}`, message: days <= 0 ? "Expirée !" : `Expire dans ${days} jours` });
    }
    if (v.date_visite_technique) {
      const days = Math.floor((new Date(v.date_visite_technique) - now) / 86400000);
      if (days <= 30) alerts.push({ type: "insurance", severity: days <= 0 ? "critical" : "warning", title: `Visite technique ${v.immatriculation}`, message: days <= 0 ? "Expirée !" : `Expire dans ${days} jours` });
    }
  });

  // Top drivers
  const driverKm = {};
  monthTrips.forEach(t => {
    driverKm[t.driver_id] = (driverKm[t.driver_id] || 0) + (t.km_parcourus || 0);
  });
  const topDrivers = Object.entries(driverKm)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, km]) => {
      const d = drivers.find(dr => dr.id === id);
      return { name: d ? `${d.prenom} ${d.nom}` : "Inconnu", km };
    });

  const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de votre flotte</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Disponibles" value={active} subtitle={`${vehicles.length} total`} icon={Truck} color="green" />
        <KpiCard title="En mission" value={enMission} icon={Route} color="blue" />
        <KpiCard title="Maintenance" value={enMaint} icon={Wrench} color="orange" />
        <KpiCard title="Hors service" value={horsService} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Coût carburant (mois)" value={formatCFA(totalFuelCost)} icon={Fuel} color="orange" />
        <KpiCard title="Km parcourus (mois)" value={totalKmMonth.toLocaleString("fr-FR") + " km"} icon={TrendingUp} color="primary" />
        <KpiCard title="Taux d'utilisation" value={fleetRate + "%"} subtitle={`${active + enMission}/${vehicles.length} véhicules`} icon={Activity} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartSvg data={fuelChartData} title="Carburant par véhicule (7 jours, litres)" />
        <AlertsList alerts={alerts} />
      </div>

      {topDrivers.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Top chauffeurs du mois</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topDrivers.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.km.toLocaleString("fr-FR")} km</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}