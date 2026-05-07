import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fuel } from "lucide-react";

const stations = [
  { label: "Star Oil - Pompier", value: "Star Oil - Pompier" },
  { label: "Star Oil - SIPS", value: "Star Oil - SIPS" },
  { label: "Star Oil - Sangalkam", value: "Star Oil - Sangalkam" },
  { label: "Elton", value: "Elton" },
  { label: "TOTAL", value: "TOTAL" },
  { label: "SHELL", value: "SHELL" },
];

const emptyForm = {
  vehicle_id: "",
  date: new Date().toISOString().split("T")[0],
  station: "",
  litres: "",
  prix_litre: "",
  km_compteur: "",
};

export default function FuelSupplyDialog({ open, onOpenChange, vehicles, entry, onSave, isPending }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (entry) {
      setForm({
        id: entry.id,
        vehicle_id: entry.vehicle_id || "",
        date: entry.date || "",
        station: entry.station || "",
        litres: entry.litres || "",
        prix_litre: entry.prix_litre || "",
        km_compteur: entry.km_compteur || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [entry, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const montantCalc = (form.litres && form.prix_litre)
    ? Number(form.litres) * Number(form.prix_litre)
    : 0;

  const isValid = form.vehicle_id && form.date && form.litres;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-secondary" />
            {entry ? "Modifier l'approvisionnement" : "Nouvel approvisionnement"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Véhicule *</Label>
            <Select value={form.vehicle_id} onValueChange={v => set("vehicle_id", v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.immatriculation} — {v.marque} {v.modele}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date *</Label>
              <Input type="date" className="mt-1" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Station</Label>
              <Select value={form.station} onValueChange={v => set("station", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Litres *</Label>
              <Input type="number" min="0" className="mt-1" placeholder="Ex: 150" value={form.litres} onChange={e => set("litres", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Prix / litre (FCFA)</Label>
              <Input type="number" min="0" className="mt-1" placeholder="Ex: 650" value={form.prix_litre} onChange={e => set("prix_litre", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Km compteur</Label>
              <Input type="number" min="0" className="mt-1" placeholder="Optionnel" value={form.km_compteur} onChange={e => set("km_compteur", e.target.value)} />
            </div>
            <div className="flex items-end">
              <div className="w-full bg-muted/60 rounded-lg px-3 py-2 text-xs">
                <span className="text-muted-foreground">Montant :</span>
                <span className="font-bold ml-2 text-secondary">
                  {montantCalc > 0 ? montantCalc.toLocaleString("fr-FR") + " FCFA" : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            onClick={() => onSave({ ...form, _montant: montantCalc })}
            disabled={!isValid || isPending}
          >
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}