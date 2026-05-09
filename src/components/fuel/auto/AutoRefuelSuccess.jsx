import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin, Clock, Fuel } from "lucide-react";

export default function AutoRefuelSuccess({ transaction, driver, vehicle, onClose }) {
  return (
    <div className="p-8 flex flex-col items-center text-center space-y-5">
      {/* Icône succès */}
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-green-700">Rechargement confirmé !</h2>
        <p className="text-sm text-muted-foreground mt-1">Transaction enregistrée avec succès</p>
      </div>

      {/* Récapitulatif */}
      <div className="w-full bg-muted/40 rounded-2xl p-4 space-y-3 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Chauffeur</span>
          <span className="text-sm font-semibold">{driver?.prenom} {driver?.nom}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Véhicule</span>
          <span className="text-sm font-mono font-bold">{vehicle?.immatriculation}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Fuel className="w-3 h-3" /> Litres</span>
          <span className="text-sm font-bold text-secondary">{transaction?.litres} L</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Station</span>
          <span className="text-sm">{transaction?.station}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Heure</span>
          <span className="text-sm">{transaction?.heure} — {transaction?.date}</span>
        </div>
        {transaction?.gps && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS</span>
            <span className="text-xs font-mono text-muted-foreground">{transaction.gps.lat}, {transaction.gps.lng}</span>
          </div>
        )}
        <div className="border-t pt-2">
          <span className="text-xs text-muted-foreground">Bons validés</span>
          <p className="text-xs font-mono text-green-700 mt-0.5">{transaction?.bonsNums}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          ID Transaction : <span className="font-mono">{transaction?.id?.slice(0, 8)}...</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        📲 Notification WhatsApp envoyée au Responsable Opérations
      </p>

      <Button className="w-full h-12 bg-primary font-bold" onClick={() => onClose({ id: transaction?.id })}>
        Terminer
      </Button>
    </div>
  );
}