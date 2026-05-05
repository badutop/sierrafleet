import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Fuel, AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const zoneConsoVal = { zone1: 9, zone2: 25, zone3: 30, zone4: 40 };

const emptyRow = { code_ct: "", vehicle_id: "", bl: "", poids_kg: "" };

export default function RotationSheetEntry({ open, onClose, campaign, client, vehicles, drivers, existingRotationsCount, onSaved }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState([{ ...emptyRow }]);

  useEffect(() => { if (open) { setDate(new Date().toISOString().split("T")[0]); setRows([{ ...emptyRow }]); } }, [open]);

  const addRow = () => setRows(prev => [...prev, { ...emptyRow }]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const totalPoids = rows.reduce((s, r) => s + (Number(r.poids_kg) || 0), 0);
  const consoParRotation = client ? zoneConsoVal[client.zone] || 9 : 9;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validRows = rows.filter(r => r.vehicle_id && r.poids_kg);
      if (validRows.length === 0) throw new Error("Aucune ligne valide");

      let totalPoidsAdded = 0;
      let rotCount = existingRotationsCount;
      const refuels = [];

      for (const row of validRows) {
        rotCount += 1;
        const refuelDeclenche = rotCount % 3 === 0;
        await base44.entities.Rotation.create({
          campaign_id: campaign.id,
          vehicle_id: row.vehicle_id,
          driver_id: "",
          numero_rotation: rotCount,
          numero_bon_client: row.bl || "",
          date_rotation: new Date(date).toISOString(),
          poids_charge_tonnes: Number(row.poids_kg),
          litres_carburant_alloues: consoParRotation,
          refuel_declenche: refuelDeclenche,
          bon_physique_recu: false,
          statut: "livree",
        });
        totalPoidsAdded += Number(row.poids_kg);
        if (refuelDeclenche) {
          refuels.push({ vehicle_id: row.vehicle_id, litres: consoParRotation * 3 });
          await base44.entities.FuelEntry.create({
            vehicle_id: row.vehicle_id,
            date,
            litres: consoParRotation * 3,
            montant_total: consoParRotation * 3 * 650,
            km_compteur: 0,
            station: `Refuel auto — Rotation #${rotCount} (${campaign.nom_campagne})`,
          });
        }
      }

      await base44.entities.Campaign.update(campaign.id, {
        nombre_rotations_realisees: (campaign.nombre_rotations_realisees || 0) + validRows.length,
        tonnage_realise: (campaign.tonnage_realise || 0) + totalPoidsAdded,
      });

      return { count: validRows.length, refuels };
    },
    onSuccess: ({ count, refuels }) => {
      toast.success(`${count} rotation(s) enregistrée(s)`);
      if (refuels.length > 0) toast.info(`${refuels.length} refuel(s) automatique(s) déclenché(s)`);
      onSaved();
      onClose();
    },
  });

  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold uppercase tracking-wide">
            Fiche de débarquement — {campaign?.nom_campagne}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{campaign?.type_marchandise} · BL Navire : {campaign?.bl_navire || "—"} · Client : {client?.nom || "—"} ({client?.zone?.toUpperCase()})</p>
        </DialogHeader>

        <div className="flex items-center gap-4 mt-2">
          <div>
            <Label className="text-xs">Date de la journée</Label>
            <Input type="date" className="mt-1 w-44" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="text-xs text-muted-foreground mt-5">
            Conso. carburant / rotation : <span className="font-semibold text-secondary">{consoParRotation} L</span>
          </div>
        </div>

        {/* Table de saisie calquée sur la fiche papier */}
        <div className="mt-4 rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                <TableHead className="text-primary-foreground font-bold w-10">#</TableHead>
                <TableHead className="text-primary-foreground font-bold w-20">CT</TableHead>
                <TableHead className="text-primary-foreground font-bold">CAMION (Immat.)</TableHead>
                <TableHead className="text-primary-foreground font-bold w-28">BL</TableHead>
                <TableHead className="text-primary-foreground font-bold w-32 text-right">POIDS (kg)</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => {
                const rotNum = existingRotationsCount + i + 1;
                const isRefuel = rotNum % 3 === 0;
                return (
                  <TableRow key={i} className={cn(isRefuel && "bg-amber-50 dark:bg-amber-950/20")}>
                    <TableCell className="font-semibold text-sm text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <Input
                        className="h-7 text-xs font-bold w-16"
                        placeholder="CT32"
                        value={row.code_ct}
                        onChange={e => updateRow(i, "code_ct", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={row.vehicle_id || "none"} onValueChange={v => updateRow(i, "vehicle_id", v === "none" ? "" : v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Sélectionner camion" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Sélectionner --</SelectItem>
                          {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation}{v.marque ? ` · ${v.marque}` : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 text-xs font-mono w-24"
                        placeholder="6693"
                        value={row.bl}
                        onChange={e => updateRow(i, "bl", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-7 text-xs text-right font-semibold w-28"
                        placeholder="37120"
                        value={row.poids_kg}
                        onChange={e => updateRow(i, "poids_kg", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isRefuel && <Fuel className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Refuel déclenché" />}
                        {rows.length > 1 && (
                          <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Ligne de total */}
              <TableRow className="bg-secondary/10 font-bold">
                <TableCell colSpan={4} className="text-right text-sm font-bold uppercase tracking-wide text-secondary">TD : {rows.filter(r => r.vehicle_id && r.poids_kg).length} ROTATIONS</TableCell>
                <TableCell className="text-right text-sm font-bold text-secondary">{totalPoids.toLocaleString("fr-FR")}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-2 text-xs text-amber-600 mt-1">
          <Fuel className="w-3.5 h-3.5" />
          <span>Les lignes en fond ambre indiquent un refuel automatique (toutes les 3 rotations cumulées)</span>
        </div>

        {/* Récap cumuls */}
        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">TD (aujourd'hui)</span><span className="font-bold">{rows.filter(r => r.poids_kg).length} rotations → {(totalPoids / 1000).toFixed(3)} T</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cumul après saisie</span><span className="font-bold">{(existingRotationsCount + rows.filter(r => r.vehicle_id && r.poids_kg).length)} rotations → {(((campaign?.tonnage_realise || 0) + totalPoids) / 1000).toFixed(3)} T</span></div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button className="flex-1 bg-secondary hover:bg-secondary/90" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || rows.filter(r => r.vehicle_id && r.poids_kg).length === 0}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Enregistrement..." : `Valider (${rows.filter(r => r.vehicle_id && r.poids_kg).length} rotation(s))`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}