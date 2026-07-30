import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fuel, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { FUEL_PRICE_KEY, getFuelPricePerLitre } from "@/pages/SettingsPage";

export default function FuelPriceDialog({ open, onClose }) {
  const [fuelPrice, setFuelPrice] = useState(() => getFuelPricePerLitre());

  const handleSave = () => {
    localStorage.setItem(FUEL_PRICE_KEY, String(fuelPrice));
    toast.success("Prix du carburant mis à jour");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
          <Fuel className="w-5 h-5 text-secondary shrink-0" />
          <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
            Carburant
          </DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Ce prix sera utilisé automatiquement pour calculer les montants d'approvisionnement.
        </p>

        <div className="space-y-3 mt-2">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Fuel className="w-3.5 h-3.5" />Prix du carburant</p>
            <div>
              <Label className="text-xs">Prix du carburant (FCFA / litre)</Label>
              <Input type="number" min="0" className="mt-1 bg-card" placeholder="Ex: 650" value={fuelPrice} onChange={e => setFuelPrice(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
          </Button>
          <Button className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
