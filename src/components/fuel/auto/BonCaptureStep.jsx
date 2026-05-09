import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Camera, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import BonSlot from "./BonSlot";

const REQUIRED_BONS = 3;

export default function BonCaptureStep({ drivers, vehicles, rotations, onDone }) {
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [bons, setBons] = useState(Array(REQUIRED_BONS).fill(null)); // null | {file, previewUrl}
  const [activatingSlot, setActivatingSlot] = useState(null);

  const driver = drivers.find(d => d.id === driverId);
  const vehicle = vehicles.find(v => v.id === vehicleId);
  const allCaptured = bons.every(b => b !== null);
  const canProceed = driverId && vehicleId && allCaptured;

  const handleCapture = (slotIdx, file, previewUrl) => {
    setBons(prev => {
      const next = [...prev];
      next[slotIdx] = { file, previewUrl };
      return next;
    });
    setActivatingSlot(null);
  };

  const handleRemove = (slotIdx) => {
    setBons(prev => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  };

  const handleNext = () => {
    onDone({
      bons: bons.map((b, i) => ({ ...b, slotIndex: i, ocrNumber: null })),
      driver,
      vehicle,
    });
  };

  return (
    <div className="p-5 space-y-5">
      {/* Sélection chauffeur / véhicule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold mb-1 block">Chauffeur</Label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Choisir..." />
            </SelectTrigger>
            <SelectContent>
              {drivers.filter(d => d.statut !== "inactif").map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.prenom} {d.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1 block">Véhicule</Label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Choisir..." />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.immatriculation} {v.code_camion ? `(${v.code_camion})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Instruction */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
        <p className="text-xs font-semibold text-amber-800">
          📋 Photographiez vos {REQUIRED_BONS} bons de rotation
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          Chaque bon doit être lisible et non utilisé
        </p>
      </div>

      {/* Slots bons */}
      <div className="space-y-3">
        {bons.map((bon, i) => (
          <BonSlot
            key={i}
            index={i}
            bon={bon}
            driver={driver}
            vehicle={vehicle}
            active={activatingSlot === i}
            onActivate={() => setActivatingSlot(i)}
            onCapture={(file, url) => handleCapture(i, file, url)}
            onRemove={() => handleRemove(i)}
            onCancel={() => setActivatingSlot(null)}
          />
        ))}
      </div>

      {/* Progression */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-muted rounded-full h-2">
          <div
            className="bg-secondary h-2 rounded-full transition-all"
            style={{ width: `${(bons.filter(Boolean).length / REQUIRED_BONS) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {bons.filter(Boolean).length}/{REQUIRED_BONS}
        </span>
      </div>

      <Button
        className="w-full h-12 text-base font-bold bg-secondary hover:bg-secondary/90 text-white"
        disabled={!canProceed}
        onClick={handleNext}
      >
        <ArrowRight className="w-5 h-5 mr-2" />
        Valider les bons
      </Button>
    </div>
  );
}