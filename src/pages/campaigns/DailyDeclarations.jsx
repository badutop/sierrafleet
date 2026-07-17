import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statutColors = { brouillon: "bg-muted text-muted-foreground", soumis: "bg-blue-500/10 text-blue-600", valide: "bg-emerald-500/10 text-emerald-600", ecart_detecte: "bg-destructive/10 text-destructive" };
const statutLabels = { brouillon: "Brouillon", soumis: "Soumis", valide: "Validé", ecart_detecte: "Écart détecté" };

export default function DailyDeclarations({ campaignId, declarations, vehicles, assignedVehicles, campaign }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", date_declaration: new Date().toISOString().split("T")[0], bl_navire: campaign?.navire || "", type_marchandise: campaign?.type_marchandise || "", nombre_rotations_jour: "", tonnage_total_jour: "", bons_systeme: "", bons_physiques: "", litres_carburant_consommes: "", observations: "" });
  const queryClient = useQueryClient();

  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const ecart = Number(data.bons_systeme || 0) - Number(data.bons_physiques || 0);
      const { error } = await supabase.from("daily_declarations").insert({
        id: crypto.randomUUID(),
        ...data,
        campaign_id: campaignId,
        vehicle_id: data.vehicle_id || null,
        nombre_rotations_jour: Number(data.nombre_rotations_jour || 0),
        tonnage_total_jour: Number(data.tonnage_total_jour || 0),
        bons_systeme: Number(data.bons_systeme || 0),
        bons_physiques: Number(data.bons_physiques || 0),
        litres_carburant_consommes: Number(data.litres_carburant_consommes || 0),
        ecart_bons: ecart,
        statut_validation: ecart !== 0 ? "ecart_detecte" : "soumis",
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["declarations", campaignId] }); setDialogOpen(false); toast.success("Déclaration enregistrée"); },
  });

  const ecartPreview = Number(form.bons_systeme || 0) - Number(form.bons_physiques || 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Déclaration journalière
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Camion</TableHead>
              <TableHead className="font-bold">BL Navire</TableHead>
              <TableHead className="text-right font-bold">Rotations</TableHead>
              <TableHead className="text-right font-bold">Tonnage (kg)</TableHead>
              <TableHead className="text-right font-bold">Bons sys.</TableHead>
              <TableHead className="text-right font-bold">Bons phys.</TableHead>
              <TableHead className="text-right font-bold">Écart</TableHead>
              <TableHead className="font-bold">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {declarations.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">Aucune déclaration enregistrée</TableCell></TableRow>
            ) : declarations.map(d => (
              <TableRow key={d.id}>
                <TableCell className="text-sm font-medium">{d.date_declaration}</TableCell>
                <TableCell className="text-sm font-mono">{vehicleMap[d.vehicle_id]?.immatriculation || "—"}</TableCell>
                <TableCell className="text-sm font-mono">{d.bl_navire || "—"}</TableCell>
                <TableCell className="text-right text-sm">{d.nombre_rotations_jour}</TableCell>
                <TableCell className="text-right text-sm font-semibold">{Number(d.tonnage_total_jour || 0).toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right text-sm">{d.bons_systeme}</TableCell>
                <TableCell className="text-right text-sm">{d.bons_physiques}</TableCell>
                <TableCell className={cn("text-right text-sm font-bold", d.ecart_bons !== 0 ? "text-destructive" : "text-emerald-600")}>
                  {d.ecart_bons > 0 ? `+${d.ecart_bons}` : d.ecart_bons}
                </TableCell>
                <TableCell><Badge className={cn("text-[10px]", statutColors[d.statut_validation])}>{statutLabels[d.statut_validation]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Déclaration journalière</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div><Label className="text-xs">Date *</Label><Input type="date" className="mt-1" value={form.date_declaration} onChange={e => setForm({ ...form, date_declaration: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Camion</Label>
              <Select value={form.vehicle_id || "none"} onValueChange={v => setForm({ ...form, vehicle_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Tous --</SelectItem>
                  {assignedVehicles.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Aucun camion affecté à cette campagne</div>
                  ) : (
                    assignedVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">BL Navire</Label><Input className="mt-1" value={form.bl_navire} onChange={e => setForm({ ...form, bl_navire: e.target.value })} /></div>
            <div><Label className="text-xs">Type marchandise</Label><Input className="mt-1" value={form.type_marchandise} onChange={e => setForm({ ...form, type_marchandise: e.target.value })} /></div>
            <div><Label className="text-xs">Rotations du jour</Label><Input type="number" className="mt-1" value={form.nombre_rotations_jour} onChange={e => setForm({ ...form, nombre_rotations_jour: e.target.value })} /></div>
            <div><Label className="text-xs">Tonnage total (kg)</Label><Input type="number" className="mt-1" value={form.tonnage_total_jour} onChange={e => setForm({ ...form, tonnage_total_jour: e.target.value })} /></div>
            <div><Label className="text-xs">Bons système</Label><Input type="number" className="mt-1" value={form.bons_systeme} onChange={e => setForm({ ...form, bons_systeme: e.target.value })} /></div>
            <div><Label className="text-xs">Bons physiques collectés</Label><Input type="number" className="mt-1" value={form.bons_physiques} onChange={e => setForm({ ...form, bons_physiques: e.target.value })} /></div>
            <div><Label className="text-xs">Carburant consommé (L)</Label><Input type="number" className="mt-1" value={form.litres_carburant_consommes} onChange={e => setForm({ ...form, litres_carburant_consommes: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">Observations</Label><Input className="mt-1" value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>
          </div>
          {(form.bons_systeme !== "" || form.bons_physiques !== "") && (
            <div className={cn("mt-2 p-3 rounded-lg text-xs flex items-center gap-2", ecartPreview !== 0 ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-emerald-500/10 text-emerald-700 border border-emerald-400/20")}>
              {ecartPreview !== 0 ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
              {ecartPreview !== 0 ? `Écart de ${Math.abs(ecartPreview)} bon(s) ${ecartPreview > 0 ? "manquant(s) physiquement" : "en surplus physique"}` : "Bons système et physiques concordent"}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.date_declaration}>
              {createMutation.isPending ? "Enregistrement..." : "Soumettre"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}