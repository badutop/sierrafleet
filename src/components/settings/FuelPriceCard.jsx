import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, Settings2 } from "lucide-react";
import FuelPriceDialog from "./FuelPriceDialog";
import { getFuelPricePerLitre } from "@/pages/SettingsPage";

export default function FuelPriceCard() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card className="border-2 border-secondary/40 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
              <Fuel className="w-5 h-5 text-secondary" />
            </div>
            <span className="font-bold">Carburant</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{getFuelPricePerLitre()} FCFA / litre</p>
          <Button className="w-full h-10 rounded-lg font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => setDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer le prix
          </Button>
        </CardContent>
      </Card>

      <FuelPriceDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
