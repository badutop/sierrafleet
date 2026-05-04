import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const typeLabels = { vidange: "Vidange", revision: "Révision", pneus: "Pneus", filtres: "Filtres", freins: "Freins", controle_technique: "Contrôle technique", assurance: "Assurance", autre: "Autre" };

export default function MaintenancePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const { data: maintenances = [], isLoading } = useQuery({ queryKey: ["maintenances"], queryFn: () => base44.entities.Maintenance.list("-date_entretien", 200) });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Maintenance.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["maintenances"] }); setDialogOpen(false); setForm({}); toast.success("Entretien enregistré"); },
  });

  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v.immatriculation]));
  const totalCost = maintenances.reduce((s, m) => s + (m.cout || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance & Entretiens</h1>
          <p className="text-sm text-muted-foreground">{maintenances.length} entretiens — Coût total : {new Intl.NumberFormat("fr-FR").format(totalCost)} FCFA</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"><Plus className="w-4 h-4 mr-2" /> Nouvel entretien</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enregistrer un entretien</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="col-span-2">
                <Label className="text-xs">Véhicule</Label>
                <Select value={form.vehicle_id || ""} onValueChange={v => setForm({...form, vehicle_id: v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type_entretien || "vidange"} onValueChange={v => setForm({...form, type_entretien: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(typeLabels).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Date</Label><Input type="date" className="mt-1" value={form.date_entretien||""} onChange={e => setForm({...form, date_entretien: e.target.value})} /></div>
              <div><Label className="text-xs">Prestataire</Label><Input className="mt-1" value={form.prestataire||""} onChange={e => setForm({...form, prestataire: e.target.value})} /></div>
              <div><Label className="text-xs">Coût (FCFA)</Label><Input type="number" className="mt-1" value={form.cout||""} onChange={e => setForm({...form, cout: Number(e.target.value)})} /></div>
              <div><Label className="text-xs">Km</Label><Input type="number" className="mt-1" value={form.km_entretien||""} onChange={e => setForm({...form, km_entretien: Number(e.target.value)})} /></div>
              <div><Label className="text-xs">Pièces remplacées</Label><Input className="mt-1" value={form.pieces_remplacees||""} onChange={e => setForm({...form, pieces_remplacees: e.target.value})} /></div>
            </div>
            <Button className="w-full mt-4 bg-secondary hover:bg-secondary/90" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Enregistrer</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Véhicule</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Prestataire</TableHead>
              <TableHead className="text-xs">Pièces</TableHead>
              <TableHead className="text-xs text-right">Coût</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><div className="w-6 h-6 border-2 border-muted border-t-secondary rounded-full animate-spin mx-auto" /></TableCell></TableRow>
            ) : maintenances.slice(0, 50).map(m => (
              <TableRow key={m.id} className="hover:bg-muted/30">
                <TableCell className="text-xs">{m.date_entretien}</TableCell>
                <TableCell className="text-xs font-medium">{vMap[m.vehicle_id] || "-"}</TableCell>
                <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{typeLabels[m.type_entretien] || m.type_entretien}</Badge></TableCell>
                <TableCell className="text-xs">{m.prestataire}</TableCell>
                <TableCell className="text-xs max-w-32 truncate">{m.pieces_remplacees}</TableCell>
                <TableCell className="text-xs text-right font-medium">{(m.cout || 0).toLocaleString("fr-FR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}