import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Camera, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import BonSlot from "./BonSlot";

const REQUIRED_BONS = 3;
const DEMO_MODE = true; // ⚡ MODE DÉMO — bypasse la capture des photos

// Image placeholder utilisée en mode démo
const DEMO_PREVIEW = "https://placehold.co/320x200/e2e8f0/64748b?text=BON+DEMO";

export default function BonCaptureStep({ drivers, vehicles, rotations, onDone, preselectedDriver = null, preselectedVehicle = null }) {
  const isDriverMode = !!(preselectedDriver && preselectedVehicle);
  const [driverId, setDriverId] = useState(preselectedDriver?.id || "");
  const [vehicleId, setVehicleId] = useState(preselectedVehicle?.id || "");
  const [bons, setBons] = useState(Array(REQUIRED_BONS).fill(null)); // null | {file, previewUrl}
  const [activatingSlot, setActivatingSlot] = useState(null);

  const driver = preselectedDriver || drivers.find(d => d.id === driverId);
  const vehicle = preselectedVehicle || vehicles.find(v => v.id === vehicleId);
  const allCaptured = DEMO_MODE || bons.every(b => b !== null);
  const canProceed = (isDriverMode || (driverId && vehicleId)) && allCaptured;

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
    const demoBons = Array(REQUIRED_BONS).fill(null).map((_, i) => ({
      file: null,
      previewUrl: DEMO_PREVIEW,
      slotIndex: i,
      ocrNumber: null,
    }));
    onDone({
      bons: DEMO_MODE ? demoBons : bons.map((b, i) => ({ ...b, slotIndex: i, ocrNumber: null })),
      driver,
      vehicle,
    });
  };

  return (
    <div className="p-5 space-y-5">
      {/* Chauffeur / véhicule — affiché ou sélectionnable */}
      {isDriverMode ? (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Chauffeur</p>
            <p className="text-sm font-bold">{driver?.prenom} {driver?.nom}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Véhicule</p>
            <p className="text-sm font-bold font-mono">{vehicle?.immatriculation}</p>
          </div>
        </div>
      ) : (
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
      )}

      {/* Instruction */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
        <p className="text-xs font-semibold text-amber-800">
          📋 Photographiez vos {REQUIRED_BONS} bons de rotation
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          Chaque bon doit être lisible et non utilisé
        </p>
      </div>

      {DEMO_MODE && (
        <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-800 font-semibold flex items-center gap-1.5">
          ⚡ MODE DÉMO — Photos non requises, choisissez juste chauffeur + véhicule
        </div>
      )}

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