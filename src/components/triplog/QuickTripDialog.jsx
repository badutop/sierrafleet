import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Autocomplete from "@/components/ui/autocomplete";
import { Zap } from "lucide-react";
import { toast } from "sonner";

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
    queryFn: () => base44.entities.Vehicle.list(),
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.list(),
  });

  const vehicleOptions = useMemo(() =>
    vehicles.map(v => ({
      id: v.id,
      label: v.immatriculation,
      sublabel: [v.code_camion, v.marque, v.modele].filter(Boolean).join(" · "),
      km_actuel: v.km_actuel,
    })), [vehicles]);

  const driverOptions = useMemo(() =>
    drivers.filter(d => d.statut !== "inactif").map(d => ({
      id: d.id,
      label: `${d.prenom} ${d.nom}`,
      sublabel: d.categorie_permis ? `Permis ${d.categorie_permis}` : undefined,
    })), [drivers]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TripLog.create(data),
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary" />
            Saisie rapide — Carnet de bord
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Véhicule */}
          <div className="col-span-2">
            <Label className="text-xs">Véhicule *</Label>
            <Autocomplete
              className="mt-1"
              placeholder="Immatriculation ou code camion..."
              value={form.vehicle_text}
              onChange={v => set("vehicle_text", v)}
              onSelect={handleSelectVehicle}
              options={vehicleOptions}
            />
          </div>

          {/* Chauffeur */}
          <div className="col-span-2">
            <Label className="text-xs">Chauffeur *</Label>
            <Autocomplete
              className="mt-1"
              placeholder="Nom du chauffeur..."
              value={form.driver_text}
              onChange={v => set("driver_text", v)}
              onSelect={handleSelectDriver}
              options={driverOptions}
            />
          </div>

          {/* Mission */}
          <div className="col-span-2">
            <Label className="text-xs">Mission *</Label>
            <Input className="mt-1" placeholder="Ex: Livraison client, transport marchandises..." value={form.mission} onChange={e => set("mission", e.target.value)} />
          </div>

          {/* Destination */}
          <div>
            <Label className="text-xs">Destination</Label>
            <Input className="mt-1" placeholder="Lieu d'arrivée" value={form.destination} onChange={e => set("destination", e.target.value)} />
          </div>

          {/* Département */}
          <div>
            <Label className="text-xs">Département / Zone</Label>
            <Input className="mt-1" placeholder="Ex: Dakar, Thiès..." value={form.departement} onChange={e => set("departement", e.target.value)} />
          </div>

          {/* Date */}
          <div>
            <Label className="text-xs">Date départ</Label>
            <Input type="date" className="mt-1" value={form.date_depart} onChange={e => set("date_depart", e.target.value)} />
          </div>

          {/* Heure */}
          <div>
            <Label className="text-xs">Heure départ</Label>
            <Input type="time" className="mt-1" value={form.heure_depart} onChange={e => set("heure_depart", e.target.value)} />
          </div>

          {/* Km départ */}
          <div>
            <Label className="text-xs">Km compteur départ</Label>
            <Input type="number" className="mt-1" placeholder="Kilométrage actuel" value={form.km_depart} onChange={e => set("km_depart", e.target.value)} />
          </div>

          {/* Statut */}
          <div>
            <Label className="text-xs">Statut</Label>
            <Select value={form.statut} onValueChange={v => set("statut", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observations */}
          <div className="col-span-2">
            <Label className="text-xs">Observations</Label>
            <Input className="mt-1" placeholder="Notes optionnelles..." value={form.observations} onChange={e => set("observations", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button
            className="flex-1 bg-secondary hover:bg-secondary/90"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Enregistrement..." : "Enregistrer le trajet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}