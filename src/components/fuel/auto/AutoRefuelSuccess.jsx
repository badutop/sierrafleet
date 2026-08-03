import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

// Écran volontairement minimal (peu de texte, un grand check vert) — pensé
// pour des chauffeurs qui lisent/écrivent souvent peu. Le détail complet de
// la transaction (station, GPS, bons, heure...) reste consultable ailleurs
// (Carburant, audit) pour qui en a besoin.
export default function AutoRefuelSuccess({ transaction, onClose }) {
  return (
    <div className="p-8 flex flex-col items-center text-center gap-6 py-16">
      <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="w-16 h-16 text-green-600" />
      </div>

      <p className="text-lg font-bold text-secondary">{transaction?.litres} L</p>

      <Button className="w-full h-12 bg-primary font-bold" onClick={() => onClose({ id: transaction?.id })}>
        Terminer
      </Button>
    </div>
  );
}