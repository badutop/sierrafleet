import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Truck, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FuelCostBreakdown({ consumptionData, rotationFuelData, formatCFA }) {
  const costByVehicle = useMemo(() => {
    return consumptionData.map(d => ({
      name: d.vehicle.immatriculation || d.vehicle.code_camion,
      cout: d.reelCost,
      cout_par_km: d.coutParKm,
      cout_par_litre: d.prixMoyenLitre,
    }));
  }, [consumptionData]);

  const totalCost = useMemo(() => consumptionData.reduce((s, d) => s + d.reelCost, 0), [consumptionData]);

  const COLORS = ["#1e40af", "#ea580c", "#16a34a", "#dc2626", "#9333ea", "#0891b2"];

  const topVehicles = useMemo(() => {
    return [...consumptionData]
      .sort((a, b) => b.reelCost - a.reelCost)
      .slice(0, 5)
      .map(d => ({
        name: d.vehicle.immatriculation,
        value: d.reelCost,
        pct: (d.reelCost / totalCost) * 100,
      }));
  }, [consumptionData, totalCost]);

  return (
    <div className="space-y-4">
      {/* KPI Coûts — le coût total est déjà affiché en en-tête de la page
          Carburant, on ne le répète pas ici (juste les métriques en plus). */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Coût/km moyen</p>
            <p className="text-xl font-bold mt-1">
              {formatCFA(consumptionData.length > 0 ? totalCost / consumptionData.reduce((s, d) => s + d.totalKm, 0) : 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Prix/litre moyen</p>
            <p className="text-xl font-bold mt-1">
              {formatCFA(consumptionData.length > 0 ? consumptionData.reduce((s, d) => s + d.prixMoyenLitre, 0) / consumptionData.length : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique Coûts par véhicule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Coût par véhicule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {costByVehicle.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costByVehicle}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(v) => formatCFA(v)} />
                <Legend />
                <Bar dataKey="cout" fill="#ea580c" name="Coût total" />
                <Bar dataKey="cout_par_km" fill="#1e40af" name="Coût/km" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top 5 Véhicules par coût */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top 5 véhicules (par coût carburant)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topVehicles.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                    {i + 1}
                  </Badge>
                  <span className="font-mono text-sm font-semibold">{v.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-secondary">{formatCFA(v.value)}</p>
                    <p className="text-xs text-muted-foreground">{v.pct.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tableau détaillé coûts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Détail par véhicule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Véhicule</th>
                  <th className="text-right py-2 px-2">Litres</th>
                  <th className="text-right py-2 px-2">Prix/L</th>
                  <th className="text-right py-2 px-2">Coût total</th>
                  <th className="text-right py-2 px-2">Km</th>
                  <th className="text-right py-2 px-2">Coût/km</th>
                </tr>
              </thead>
              <tbody>
                {consumptionData.map(d => (
                  <tr key={d.vehicle.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-2 font-mono">{d.vehicle.immatriculation}</td>
                    <td className="text-right py-2 px-2">{Math.round(d.reelLitres)}</td>
                    <td className="text-right py-2 px-2">{formatCFA(d.prixMoyenLitre)}</td>
                    <td className="text-right py-2 px-2 font-semibold text-secondary">{formatCFA(d.reelCost)}</td>
                    <td className="text-right py-2 px-2">{Math.round(d.totalKm)}</td>
                    <td className="text-right py-2 px-2 font-semibold">{formatCFA(d.coutParKm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}