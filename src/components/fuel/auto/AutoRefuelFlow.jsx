import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Zap } from "lucide-react";
import BonCaptureStep from "./BonCaptureStep";
import BonValidationStep from "./BonValidationStep";
import PumpPhotoStep from "./PumpPhotoStep";
import AutoRefuelSuccess from "./AutoRefuelSuccess";

/**
 * Orchestrateur du flow de rechargement automatique.
 * Props:
 *   drivers, vehicles, rotations — données déjà chargées
 *   onClose(fuelEntry?) — appelé à la fermeture (avec la FuelEntry créée si succès)
 */
export default function AutoRefuelFlow({ drivers, vehicles, rotations, onClose, preselectedDriver = null, preselectedVehicle = null }) {
  const [step, setStep] = useState("capture"); // capture | validation | pump | success
  const [bons, setBons] = useState([]); // [{file, previewUrl, ocrNumber, rotation}]
  const [selectedDriver, setSelectedDriver] = useState(preselectedDriver);
  const [selectedVehicle, setSelectedVehicle] = useState(preselectedVehicle);
  const [transaction, setTransaction] = useState(null);

  const handleBonsDone = ({ bons, driver, vehicle }) => {
    setBons(bons);
    setSelectedDriver(driver);
    setSelectedVehicle(vehicle);
    setStep("validation");
  };

  const handleValidationOk = (validatedBons) => {
    setBons(validatedBons);
    setStep("pump");
  };

  const handlePumpDone = (tx) => {
    setTransaction(tx);
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-secondary" />
            <span className="font-bold text-sm">Rechargement Automatique</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Indicateur d'étape */}
            <div className="flex items-center gap-1">
              {["capture", "validation", "pump", "success"].map((s, i) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === s ? "bg-secondary scale-125" :
                    ["capture","validation","pump","success"].indexOf(step) > i ? "bg-white/60" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
            <button onClick={() => onClose()} className="text-white/80 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto">
          {step === "capture" && (
            <BonCaptureStep
              drivers={drivers}
              vehicles={vehicles}
              rotations={rotations}
              onDone={handleBonsDone}
              preselectedDriver={preselectedDriver}
              preselectedVehicle={preselectedVehicle}
            />
          )}
          {step === "validation" && (
            <BonValidationStep
              bons={bons}
              driver={selectedDriver}
              vehicle={selectedVehicle}
              rotations={rotations}
              onBack={() => setStep("capture")}
              onValidated={handleValidationOk}
            />
          )}
          {step === "pump" && (
            <PumpPhotoStep
              driver={selectedDriver}
              vehicle={selectedVehicle}
              bons={bons}
              onBack={() => setStep("validation")}
              onDone={handlePumpDone}
            />
          )}
          {step === "success" && (
            <AutoRefuelSuccess
              transaction={transaction}
              driver={selectedDriver}
              vehicle={selectedVehicle}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}