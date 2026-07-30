import React, { useState } from "react";
import { useZones } from "@/hooks/use-zones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Settings2 } from "lucide-react";
import ZonesManagerDialog from "./ZonesManagerDialog";

// Zones (Zone 1, Zone 2, ...) utilisées par les modules Clients (zone du
// client) et Dépôts (zone du dépôt) pour estimer la consommation carburant
// par rotation (voir refuelRules.consoLitresPourClient). Liste pouvant
// grandir — on n'affiche ici qu'une carte résumée, la gestion complète
// (tableau + formulaire) s'ouvre dans ZonesManagerDialog.
export default function ZonesSettingsCard() {
  const { data: zones = [] } = useZones();
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <>
      <Card className="border-secondary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MapPin className="w-4 h-4 text-secondary" />Zones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {zones.length} zone{zones.length > 1 ? "s" : ""} configurée{zones.length > 1 ? "s" : ""}
          </p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => setManagerOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer les zones
          </Button>
        </CardContent>
      </Card>

      <ZonesManagerDialog open={managerOpen} onClose={() => setManagerOpen(false)} />
    </>
  );
}
