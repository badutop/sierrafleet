import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Download, BarChart3, TrendingUp, Fuel, Wrench, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import KpiCard from "@/components/dashboard/KpiCard";
import BarChartSvg from "@/components/dashboard/BarChartSvg";
import CampaignFinancialReport from "@/components/reports/CampaignFinancialReport";

export default function Reports() {
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.TripLog.list("-date_depart", 500) });
  const { data: fuel = [] } = useQuery({ queryKey: ["fuel"], queryFn: () => base44.entities.FuelEntry.list("-date", 500) });
  const { data: maintenances = [] } = useQuery({ queryKey: ["maintenances"], queryFn: () => base44.entities.Maintenance.list("-date_entretien", 500) });

  const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  // Vehicle cost summary
  const vehicleSummary = vehicles.map(v => {
    const vTrips = trips.filter(t => t.vehicle_id === v.id);
    const vFuel = fuel.filter(f => f.vehicle_id === v.id);
    const vMaint = maintenances.filter(m => m.vehicle_id === v.id);
    const totalKm = vTrips.reduce((s, t) => s + (t.km_parcourus || 0), 0);
    const fuelCost = vFuel.reduce((s, f) => s + (f.montant_total || 0), 0);
    const maintCost = vMaint.reduce((s, m) => s + (m.cout || 0), 0);
    const totalCost = fuelCost + maintCost;
    const crk = totalKm > 0 ? Math.round(totalCost / totalKm) : 0;
    return { ...v, totalKm, fuelCost, maintCost, totalCost, crk, missions: vTrips.length };
  }).sort((a, b) => b.totalCost - a.totalCost);

  const grandTotal = vehicleSummary.reduce((s, v) => s + v.totalCost, 0);
  const grandKm = vehicleSummary.reduce((s, v) => s + v.totalKm, 0);
  const grandFuel = vehicleSummary.reduce((s, v) => s + v.fuelCost, 0);
  const grandMaint = vehicleSummary.reduce((s, v) => s + v.maintCost, 0);

  // Pareto chart: top vehicles by cost
  const paretoData = vehicleSummary.slice(0, 8).map(v => ({
    label: v.immatriculation?.split("-")[1] || "?",
    value: v.totalCost / 1000,
  }));

  const exportCSV = () => {
    const headers = "Véhicule,Km Total,Missions,Coût Carburant,Coût Maintenance,Coût Total,CRK\n";
    const rows = vehicleSummary.map(v => `${v.immatriculation},${v.totalKm},${v.missions},${v.fuelCost},${v.maintCost},${v.totalCost},${v.crk}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "rapport_flotte.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapports & Analytique</h1>
          <p className="text-sm text-muted-foreground">Récapitulatif complet de la flotte et des campagnes</p>
        </div>
      </div>

      <Tabs defaultValue="flotte">
        <TabsList>
          <TabsTrigger value="flotte"><Wrench className="w-3.5 h-3.5 mr-1" />Coûts flotte</TabsTrigger>
          <TabsTrigger value="financier"><TrendingDown className="w-3.5 h-3.5 mr-1" />Rapports Financiers</TabsTrigger>
        </TabsList>

        <TabsContent value="flotte" className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Km Total" value={grandKm.toLocaleString("fr-FR")} icon={TrendingUp} color="primary" />
            <KpiCard title="Coût Carburant" value={formatCFA(grandFuel)} icon={Fuel} color="orange" />
            <KpiCard title="Coût Maintenance" value={formatCFA(grandMaint)} icon={Wrench} color="blue" />
            <KpiCard title="Coût Total" value={formatCFA(grandTotal)} icon={BarChart3} color="red" />
          </div>
          <BarChartSvg data={paretoData} title="Coût total par véhicule (×1000 FCFA)" />
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm">Coût de revient par véhicule</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Véhicule</TableHead>
                  <TableHead className="text-xs">Marque</TableHead>
                  <TableHead className="text-xs text-right">Missions</TableHead>
                  <TableHead className="text-xs text-right">Km</TableHead>
                  <TableHead className="text-xs text-right">Carburant</TableHead>
                  <TableHead className="text-xs text-right">Maintenance</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-right">CRK (FCFA/km)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleSummary.map(v => (
                  <TableRow key={v.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-medium">{v.immatriculation}</TableCell>
                    <TableCell className="text-xs">{v.marque} {v.modele}</TableCell>
                    <TableCell className="text-xs text-right">{v.missions}</TableCell>
                    <TableCell className="text-xs text-right">{v.totalKm.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-xs text-right">{formatCFA(v.fuelCost)}</TableCell>
                    <TableCell className="text-xs text-right">{formatCFA(v.maintCost)}</TableCell>
                    <TableCell className="text-xs text-right font-bold">{formatCFA(v.totalCost)}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{v.crk}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="financier" className="mt-4">
          <CampaignFinancialReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}