import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Autocomplete from "@/components/ui/autocomplete";
import { Zap, Route, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toTimeString().slice(0, 5);

const emptyForm = () => ({
  vehicle_text: "",
  vehicle_id: "",
  driver_text: "",
  driver_id: "",
  mission: "",
  destination: "",
  departement: "",
  date_depart: today(),
  heure_depart: now(),
  km_depart: "",
  statut: "en_cours",
  observations: "",
});

export default function QuickTripDialog({ open, onClose }) {
  const [form, setForm] = useState(emptyForm());
  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const vehicleOptions = useMemo(() =>
    vehicles.map(v => ({
      id: v.id,
      label: v.immatriculation,
      km_actuel: v.km_actuel,
    })), [vehicles]);

  const driverOptions = useMemo(() =>
    drivers.filter(d => d.statut !== "inactif").map(d => ({
      id: d.id,
      label: `${d.prenom} ${d.nom}`,
      sublabel: d.categorie_permis ? `Permis ${d.categorie_permis}` : undefined,
    })), [drivers]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: row, error } = await supabase.from("trip_logs").insert({ id: crypto.randomUUID(), ...data }).select().single();
      if (error) throw error;
      await logAudit("Trajet", row.id, "create", row);
      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triplogs"] });
      toast.success("Trajet enregistré !");
      setForm(emptyForm());
      onClose();
    },
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSelectVehicle = (item) => {
    setForm(f => ({
      ...f,
      vehicle_text: item.label,
      vehicle_id: item.id,
      km_depart: f.km_depart || (item.km_actuel ? String(item.km_actuel) : ""),
    }));
  };

  const handleSelectDriver = (item) => {
    setForm(f => ({ ...f, driver_text: item.label, driver_id: item.id }));
  };

  const handleSubmit = () => {
    if (!form.vehicle_id) { toast.error("Sélectionnez un véhicule"); return; }
    if (!form.driver_id) { toast.error("Sélectionnez un chauffeur"); return; }
    if (!form.mission) { toast.error("Mission requise"); return; }

    const data = {
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      mission: form.mission,
      destination: form.destination,
      departement: form.departement,
      date_depart: `${form.date_depart}T${form.heure_depart}:00`,
      km_depart: form.km_depart ? Number(form.km_depart) : undefined,
      statut: form.statut,
      observations: form.observations,
    };
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-secondary shrink-0" />
          <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">Saisie rapide — Carnet de bord</DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Enregistrez un trajet en quelques champs</p>

        <div className="space-y-3 mt-2">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-primary flex items-center gap-1.5"><Zap className="w-4 h-4" />Trajet</p>
            <div>
              <Label className="text-xs">Véhicule <span className="text-green-600 font-bold">*</span></Label>
              <Autocomplete
                className="mt-1"
                placeholder="Immatriculation ou code camion..."
                value={form.vehicle_text}
                onChange={v => set("vehicle_text", v)}
                onSelect={handleSelectVehicle}
                options={vehicleOptions}
              />
            </div>
            <div>
              <Label className="text-xs">Chauffeur <span className="text-green-600 font-bold">*</span></Label>
              <Autocomplete
                className="mt-1"
                placeholder="Nom du chauffeur..."
                value={form.driver_text}
                onChange={v => set("driver_text", v)}
                onSelect={handleSelectDriver}
                options={driverOptions}
              />
            </div>
            <div>
              <Label className="text-xs">Mission <span className="text-green-600 font-bold">*</span></Label>
              <Input className="mt-1 bg-card" placeholder="Ex: Livraison client, transport marchandises..." value={form.mission} onChange={e => set("mission", e.target.value)} />
            </div>
          </div>

          <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5"><Route className="w-4 h-4" />Itinéraire & horaires</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Destination</Label>
                <Input className="mt-1 bg-card" placeholder="Lieu d'arrivée" value={form.destination} onChange={e => set("destination", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Département / Zone</Label>
                <Input className="mt-1 bg-card" placeholder="Ex: Dakar, Thiès..." value={form.departement} onChange={e => set("departement", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Date départ</Label>
                <Input type="date" className="mt-1 bg-card" value={form.date_depart} onChange={e => set("date_depart", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Heure départ</Label>
                <Input type="time" className="mt-1 bg-card" value={form.heure_depart} onChange={e => set("heure_depart", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Km compteur départ</Label>
                <Input type="number" className="mt-1 bg-card" placeholder="Kilométrage actuel" value={form.km_depart} onChange={e => set("km_depart", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Statut</Label>
                <Select value={form.statut} onValueChange={v => set("statut", v)}>
                  <SelectTrigger className="mt-1 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Observations</Label>
            <Input className="mt-1" placeholder="Notes optionnelles..." value={form.observations} onChange={e => set("observations", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending ? "Enregistrement..." : "Enregistrer le trajet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}