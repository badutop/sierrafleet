import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download } from "lucide-react";
import { toast } from "sonner";

export default function Journal() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: trips = [], isLoading } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.TripLog.list("-date_depart", 200) });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const kmP = (data.km_arrivee || 0) - (data.km_depart || 0);
      const conso = kmP > 0 && data.litres_carburant ? Math.round(data.litres_carburant / kmP * 100 * 10) / 10 : 0;
      const coutKm = kmP > 0 && data.cout_carburant ? Math.round(data.cout_carburant / kmP) : 0;
      return base44.entities.TripLog.create({ ...data, km_parcourus: kmP, consommation_l100: conso, cout_par_km: coutKm });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trips"] }); setDialogOpen(false); setForm({}); toast.success("Entrée ajoutée"); },
  });

  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v.immatriculation]));
  const dMap = Object.fromEntries(drivers.map(d => [d.id, `${d.prenom} ${d.nom}`]));

  const filtered = trips.filter(t => {
    const term = search.toLowerCase();
    return !term || (vMap[t.vehicle_id] || "").toLowerCase().includes(term) || (t.mission || "").toLowerCase().includes(term) || (t.destination || "").toLowerCase().includes(term);
  });

  const exportCSV = () => {
    const headers = "Date,Véhicule,Chauffeur,Mission,Destination,Km,Litres,Coût\n";
    const rows = filtered.map(t => `${t.date_depart?.split("T")[0]},${vMap[t.vehicle_id]},${dMap[t.driver_id]},${t.mission},${t.destination},${t.km_parcourus},${t.litres_carburant},${t.cout_carburant}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "journal_bord.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal de Bord</h1>
          <p className="text-sm text-muted-foreground">{trips.length} entrées</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"><Plus className="w-4 h-4 mr-2" /> Nouvelle entrée</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nouvelle sortie véhicule</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="col-span-2">
                  <Label className="text-xs">Véhicule</Label>
                  <Select value={form.vehicle_id || ""} onValueChange={v => setForm({...form, vehicle_id: v})}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation} - {v.marque}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Chauffeur</Label>
                  <Select value={form.driver_id || ""} onValueChange={v => setForm({...form, driver_id: v})}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {[["mission","Mission"],["destination","Destination"]].map(([k,l]) => (
                  <div key={k}><Label className="text-xs">{l}</Label><Input className="mt-1" value={form[k]||""} onChange={e => setForm({...form,[k]:e.target.value})} /></div>
                ))}
                <div><Label className="text-xs">Date départ</Label><Input type="datetime-local" className="mt-1" value={form.date_depart||""} onChange={e => setForm({...form,date_depart:e.target.value})} /></div>
                <div><Label className="text-xs">Date retour</Label><Input type="datetime-local" className="mt-1" value={form.date_retour||""} onChange={e => setForm({...form,date_retour:e.target.value})} /></div>
                {[["km_depart","Km départ"],["km_arrivee","Km arrivée"],["litres_carburant","Litres carburant"],["cout_carburant","Coût carburant"]].map(([k,l]) => (
                  <div key={k}><Label className="text-xs">{l}</Label><Input type="number" className="mt-1" value={form[k]||""} onChange={e => setForm({...form,[k]:Number(e.target.value)})} /></div>
                ))}
                <div className="col-span-2"><Label className="text-xs">Observations</Label><Textarea className="mt-1" value={form.observations||""} onChange={e => setForm({...form,observations:e.target.value})} /></div>
              </div>
              <Button className="w-full mt-4 bg-secondary hover:bg-secondary/90" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Véhicule</TableHead>
              <TableHead className="text-xs">Chauffeur</TableHead>
              <TableHead className="text-xs">Mission</TableHead>
              <TableHead className="text-xs">Destination</TableHead>
              <TableHead className="text-xs text-right">Km</TableHead>
              <TableHead className="text-xs text-right">Litres</TableHead>
              <TableHead className="text-xs text-right">Coût</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8"><div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin mx-auto" /></TableCell></TableRow>
            ) : filtered.slice(0, 50).map(t => (
              <TableRow key={t.id} className="hover:bg-muted/30">
                <TableCell className="text-xs">{t.date_depart?.split("T")[0]}</TableCell>
                <TableCell className="text-xs font-medium">{vMap[t.vehicle_id] || "-"}</TableCell>
                <TableCell className="text-xs">{dMap[t.driver_id] || "-"}</TableCell>
                <TableCell className="text-xs">{t.mission}</TableCell>
                <TableCell className="text-xs">{t.destination}</TableCell>
                <TableCell className="text-xs text-right font-medium">{(t.km_parcourus || 0).toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-xs text-right">{t.litres_carburant || "-"}</TableCell>
                <TableCell className="text-xs text-right">{t.cout_carburant ? new Intl.NumberFormat("fr-FR").format(t.cout_carburant) : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}