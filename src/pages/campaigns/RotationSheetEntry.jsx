import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Fuel, Save, Eye, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const zoneConsoVal = { zone1: 9, zone2: 25, zone3: 30, zone4: 40 };
const emptyRow = { code_ct: "", vehicle_id: "", bl: "", poids_kg: "" };

// ── STEP 1 : Saisie ──────────────────────────────────────────────────────────
function SheetSaisie({ date, setDate, rows, addRow, removeRow, updateRow, vehicles, consoParRotation, existingRotationsCount, campaign, onPreview, onClose }) {
  const totalPoids = rows.reduce((s, r) => s + (Number(r.poids_kg) || 0), 0);
  const validRows = rows.filter(r => r.vehicle_id && r.poids_kg);

  // Index des véhicules par code_camion (insensible à la casse)
  const vehicleByCode = Object.fromEntries(
    vehicles.filter(v => v.code_camion).map(v => [v.code_camion.toLowerCase().trim(), v])
  );

  const handleCodeChange = (i, code) => {
    updateRow(i, "code_ct", code);
    const found = vehicleByCode[code.toLowerCase().trim()];
    if (found) updateRow(i, "vehicle_id", found.id);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-bold uppercase tracking-wide">
          Fiche de débarquement — {campaign?.nom_campagne}
        </DialogTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {campaign?.type_marchandise} · BL Navire : {campaign?.bl_navire || "—"}
        </p>
      </DialogHeader>

      <div className="flex items-center gap-4 mt-2">
        <div>
          <Label className="text-xs">Date de la journée</Label>
          <Input type="date" className="mt-1 w-44" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="text-xs text-muted-foreground mt-5">
          Conso. carburant / rotation : <span className="font-semibold text-secondary">{consoParRotation} L</span>
        </div>
        <div className="ml-auto mt-5">
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter ligne
          </Button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground font-bold w-10">#</TableHead>
              <TableHead className="text-primary-foreground font-bold w-20">CT</TableHead>
              <TableHead className="text-primary-foreground font-bold">CAMION (Immat.)</TableHead>
              <TableHead className="text-primary-foreground font-bold w-28">BL</TableHead>
              <TableHead className="text-primary-foreground font-bold w-32 text-right">POIDS (kg)</TableHead>
              <TableHead className="w-10"></TableHead>
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
                     className={cn("h-7 text-xs font-bold w-16", vehicleByCode[row.code_ct?.toLowerCase()?.trim()] && "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20")}
                     placeholder="CT32"
                     value={row.code_ct}
                     onChange={e => handleCodeChange(i, e.target.value)}
                   />
                  </TableCell>
                  <TableCell>
                   <Select value={row.vehicle_id || "none"} onValueChange={v => updateRow(i, "vehicle_id", v === "none" ? "" : v)}>
                     <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Sélectionner camion" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none">-- Sélectionner --</SelectItem>
                       {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.code_camion ? `[${v.code_camion}] ` : ""}{v.immatriculation}{v.marque ? ` · ${v.marque}` : ""}</SelectItem>)}
                     </SelectContent>
                   </Select>
                   {row.vehicle_id && (() => { const v = vehicles.find(x => x.id === row.vehicle_id); return v ? <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{v.immatriculation} · {v.marque} {v.modele}</p> : null; })()}
                  </TableCell>
                  <TableCell>
                    <Input className="h-7 text-xs font-mono w-24" placeholder="6693" value={row.bl} onChange={e => updateRow(i, "bl", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-7 text-xs text-right font-semibold w-28" placeholder="37120" value={row.poids_kg} onChange={e => updateRow(i, "poids_kg", e.target.value)} />
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
            <TableRow className="bg-secondary/10">
              <TableCell colSpan={4} className="text-right text-sm font-bold uppercase tracking-wide text-secondary">TD : {validRows.length} ROTATIONS</TableCell>
              <TableCell className="text-right text-sm font-bold text-secondary">{totalPoids.toLocaleString("fr-FR")}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2 text-xs text-amber-600 mt-1">
        <Fuel className="w-3.5 h-3.5" />
        <span>Fond ambre = refuel automatique (toutes les 3 rotations cumulées)</span>
      </div>

      <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">TD (aujourd'hui)</span>
          <span className="font-bold">{validRows.length} rotations → {(totalPoids / 1000).toFixed(3)} T</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cumul après saisie</span>
          <span className="font-bold">{existingRotationsCount + validRows.length} rotations → {(((campaign?.tonnage_realise || 0) + totalPoids) / 1000).toFixed(3)} T</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
        <Button
          className="flex-1 bg-primary hover:bg-primary/90"
          onClick={onPreview}
          disabled={validRows.length === 0}
        >
          <Eye className="w-4 h-4 mr-2" />
          Aperçu & Validation ({validRows.length} ligne{validRows.length > 1 ? "s" : ""})
        </Button>
      </div>
    </>
  );
}

// ── STEP 2 : Aperçu / Validation ─────────────────────────────────────────────
function SheetPreview({ date, rows, vehicles, consoParRotation, existingRotationsCount, campaign, client, onBack, onConfirm, isPending }) {
  const validRows = rows.filter(r => r.vehicle_id && r.poids_kg);
  const totalPoids = validRows.reduce((s, r) => s + Number(r.poids_kg), 0);
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  // Calculer les refuels prévus
  const refuelsAVenir = validRows.filter((_, i) => (existingRotationsCount + i + 1) % 3 === 0);

  const dateFormatee = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <DialogTitle className="text-base font-bold uppercase tracking-wide">
            Validation — Fiche du {dateFormatee}
          </DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Vérifiez les informations avant de confirmer l'enregistrement définitif.
        </p>
      </DialogHeader>

      {/* En-tête de la fiche comme le document papier */}
      <div className="mt-3 border border-primary/40 rounded-xl overflow-hidden">
        <div className="bg-primary text-primary-foreground text-center text-sm font-bold py-2 uppercase tracking-widest">
          Débarquement {campaign?.type_marchandise}
        </div>
        <div className="bg-primary/10 text-center text-xs font-semibold py-1.5 uppercase">
          Journée du {dateFormatee}
        </div>
        {client?.nom && (
          <div className="bg-secondary text-secondary-foreground text-center text-xs font-bold py-1 uppercase">
            {client.nom} — {client.zone?.toUpperCase()}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="font-bold text-xs w-10">CT</TableHead>
              <TableHead className="font-bold text-xs">CAMIONS</TableHead>
              <TableHead className="font-bold text-xs w-24">BL</TableHead>
              <TableHead className="font-bold text-xs text-right w-28">POIDS</TableHead>
              <TableHead className="w-16 text-xs text-center">Carb.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validRows.map((row, i) => {
              const rotNum = existingRotationsCount + i + 1;
              const isRefuel = rotNum % 3 === 0;
              const vehicle = vehicleMap[row.vehicle_id];
              return (
                <TableRow key={i} className={cn(isRefuel && "bg-amber-50 dark:bg-amber-950/20")}>
                  <TableCell className="text-xs font-bold">{row.code_ct || `CT${i + 1}`}</TableCell>
                  <TableCell className="text-xs font-mono font-semibold">{vehicle?.immatriculation || "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{row.bl || "—"}</TableCell>
                  <TableCell className="text-right text-xs font-bold">{Number(row.poids_kg).toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="text-center text-xs">
                    {isRefuel
                      ? <span className="text-amber-600 font-bold flex items-center justify-center gap-1"><Fuel className="w-3 h-3" />{consoParRotation * 3}L</span>
                      : <span className="text-muted-foreground">{consoParRotation}L</span>
                    }
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Total */}
            <TableRow className="bg-secondary/20 font-bold border-t-2 border-secondary/40">
              <TableCell colSpan={3} className="text-right text-sm font-bold uppercase text-secondary">
                TD : {validRows.length} ROTATIONS
              </TableCell>
              <TableCell className="text-right text-sm font-bold text-secondary">
                {totalPoids.toLocaleString("fr-FR")}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>

        {/* Ligne tonnage */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs font-bold flex justify-between">
          <span>TONNAGE JOURNÉE</span>
          <span className="text-secondary">{(totalPoids / 1000).toFixed(3)} T</span>
        </div>
      </div>

      {/* Résumé refuels */}
      {refuelsAVenir.length > 0 && (
        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg text-xs text-amber-700 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <Fuel className="w-3.5 h-3.5" /> {refuelsAVenir.length} refuel(s) automatique(s) prévu(s)
          </div>
          {refuelsAVenir.map((row, i) => {
            const vehicle = vehicleMap[row.vehicle_id];
            return (
              <div key={i} className="ml-5">— {vehicle?.immatriculation || "—"} : {consoParRotation * 3} L enregistrés</div>
            );
          })}
        </div>
      )}

      {/* Cumuls */}
      <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs font-bold flex justify-between">
        <span>CUMULS DÉBARQUÉS APRÈS VALIDATION</span>
        <span className="text-primary">{existingRotationsCount + validRows.length} ROTATIONS → {(((campaign?.tonnage_realise || 0) + totalPoids) / 1000).toFixed(3)} T</span>
      </div>

      {/* Avertissement */}
      <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
        <span>Après validation, les rotations seront définitivement enregistrées et les compteurs mis à jour. Cette action est irréversible.</span>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Modifier
        </Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={onConfirm}
          disabled={isPending}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isPending ? "Enregistrement..." : `Confirmer & Valider`}
        </Button>
      </div>
    </>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function RotationSheetEntry({ open, onClose, campaign, client, vehicles, drivers, existingRotationsCount, onSaved }) {
  const [step, setStep] = useState("saisie"); // "saisie" | "preview"
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState([{ ...emptyRow }]);

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split("T")[0]);
      setRows([{ ...emptyRow }]);
      setStep("saisie");
    }
  }, [open]);

  const addRow = () => setRows(prev => [...prev, { ...emptyRow }]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

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
        const { error: rotError } = await supabase.from("rotations").insert({
          id: crypto.randomUUID(),
          campaign_id: campaign.id,
          vehicle_id: row.vehicle_id,
          driver_id: row.driver_id || null,
          numero_rotation: rotCount,
          numero_bon_client: row.bl || "",
          date_rotation: new Date(date + "T12:00:00").toISOString(),
          poids_charge_tonnes: Number(row.poids_kg),
          litres_carburant_alloues: consoParRotation,
          refuel_declenche: refuelDeclenche,
          bon_physique_recu: false,
          statut: "livree",
        });
        if (rotError) throw rotError;
        totalPoidsAdded += Number(row.poids_kg);
        if (refuelDeclenche) {
          refuels.push({ vehicle_id: row.vehicle_id });
          const { error: fuelError } = await supabase.from("fuel_entries").insert({
            id: crypto.randomUUID(),
            vehicle_id: row.vehicle_id,
            date,
            litres: consoParRotation * 3,
            montant_total: consoParRotation * 3 * 650,
            km_compteur: 0,
            station: `Refuel auto — Rotation #${rotCount} (${campaign.nom_campagne})`,
            statut: "en_attente",
          });
          if (fuelError) throw fuelError;
        }
      }

      // Campaign migré sur Supabase — recouplé proprement (n'est plus best-effort).
      const { error: campaignError } = await supabase.from("campaigns").update({
        nombre_rotations_realisees: (campaign.nombre_rotations_realisees || 0) + validRows.length,
        tonnage_realise: (campaign.tonnage_realise || 0) + totalPoidsAdded,
      }).eq("id", campaign.id);
      if (campaignError) throw campaignError;

      return { count: validRows.length, refuels };
    },
    onSuccess: ({ count, refuels }) => {
      toast.success(`${count} rotation(s) validée(s) et enregistrée(s)`);
      if (refuels.length > 0) toast.info(`${refuels.length} refuel(s) automatique(s) enregistré(s)`);
      onSaved();
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === "saisie" ? (
          <SheetSaisie
            date={date} setDate={setDate}
            rows={rows} addRow={addRow} removeRow={removeRow} updateRow={updateRow}
            vehicles={vehicles}
            consoParRotation={consoParRotation}
            existingRotationsCount={existingRotationsCount}
            campaign={campaign}
            onPreview={() => setStep("preview")}
            onClose={onClose}
          />
        ) : (
          <SheetPreview
            date={date}
            rows={rows}
            vehicles={vehicles}
            consoParRotation={consoParRotation}
            existingRotationsCount={existingRotationsCount}
            campaign={campaign}
            client={client}
            onBack={() => setStep("saisie")}
            onConfirm={() => saveMutation.mutate()}
            isPending={saveMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}