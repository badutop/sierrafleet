import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Fuel } from "lucide-react";
import { toast } from "sonner";
import KpiCard from "@/components/dashboard/KpiCard";
import BarChartSvg from "@/components/dashboard/BarChartSvg";

export default function FuelManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({ queryKey: ["fuel"], queryFn: () => base44.entities.FuelEntry.list("-date", 200) });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FuelEntry.create({ ...data, montant_total: (data.litres || 0) * (data.prix_litre || 0) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["fuel"] }); setDialogOpen(false); setForm({}); toast.success("Plein enregistré"); },
  });

  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v.immatriculation]));
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthEntries = entries.filter(e => { const d = new Date(e.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const totalMonth = monthEntries.reduce((s, e) => s + (e.montant_total || 0), 0);
  const totalLitres = monthEntries.reduce((s, e) => s + (e.litres || 0), 0);
  const formatCFA = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

  // Cost per vehicle
  const costByVehicle = {};
  monthEntries.forEach(e => {
    const label = vMap[e.vehicle_id]?.split("-")[1] || "?";
    costByVehicle[label] = (costByVehicle[label] || 0) + (e.montant_total || 0);
  });
  const chartData = Object.entries(costByVehicle).map(([label, value]) => ({ label, value: value / 1000 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion Carburant</h1>
          <p className="text-sm text-muted-foreground">{entries.length} pleins enregistrés</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"><Plus className="w-4 h-4 mr-2" /> Nouveau plein</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enregistrer un plein</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="col-span-2">
                <Label className="text-xs">Véhicule</Label>
                <Select value={form.vehicle_id || ""} onValueChange={v => setForm({...form, vehicle_id: v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Date</Label><Input type="date" className="mt-1" value={form.date||""} onChange={e => setForm({...form, date: e.target.value})} /></div>
              <div><Label className="text-xs">Station</Label><Input className="mt-1" value={form.station||""} onChange={e => setForm({...form, station: e.target.value})} /></div>
              <div><Label className="text-xs">Litres</Label><Input type="number" className="mt-1" value={form.litres||""} onChange={e => setForm({...form, litres: Number(e.target.value)})} /></div>
              <div><Label className="text-xs">Prix/litre</Label><Input type="number" className="mt-1" value={form.prix_litre||""} onChange={e => setForm({...form, prix_litre: Number(e.target.value)})} /></div>
              <div><Label className="text-xs">Km compteur</Label><Input type="number" className="mt-1" value={form.km_compteur||""} onChange={e => setForm({...form, km_compteur: Number(e.target.value)})} /></div>
            </div>
            <Button className="w-full mt-4 bg-secondary hover:bg-secondary/90" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Enregistrer</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Dépense mois" value={formatCFA(totalMonth)} icon={Fuel} color="orange" />
        <KpiCard title="Litres mois" value={totalLitres.toLocaleString("fr-FR") + " L"} icon={Fuel} color="blue" />
        <KpiCard title="Prix moyen/L" value={monthEntries.length ? formatCFA(totalMonth / totalLitres) : "-"} icon={Fuel} color="primary" />
      </div>

      <BarChartSvg data={chartData} title="Coût carburant par véhicule ce mois (×1000 FCFA)" />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Véhicule</TableHead>
              <TableHead className="text-xs">Station</TableHead>
              <TableHead className="text-xs text-right">Litres</TableHead>
              <TableHead className="text-xs text-right">Prix/L</TableHead>
              <TableHead className="text-xs text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin mx-auto" /></TableCell></TableRow>
            ) : entries.slice(0, 50).map(e => (
              <TableRow key={e.id} className="hover:bg-muted/30">
                <TableCell className="text-xs">{e.date}</TableCell>
                <TableCell className="text-xs font-medium">{vMap[e.vehicle_id] || "-"}</TableCell>
                <TableCell className="text-xs">{e.station}</TableCell>
                <TableCell className="text-xs text-right">{e.litres}</TableCell>
                <TableCell className="text-xs text-right">{e.prix_litre?.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-xs text-right font-medium">{(e.montant_total || 0).toLocaleString("fr-FR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}