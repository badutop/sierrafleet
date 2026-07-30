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
      <Card className="border-secondary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Fuel className="w-4 h-4 text-secondary" />Carburant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{getFuelPricePerLitre()} FCFA / litre</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer le prix
          </Button>
        </CardContent>
      </Card>

      <FuelPriceDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
