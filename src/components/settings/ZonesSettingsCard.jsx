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
      <Card className="border-2 border-purple-500/40 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <span className="font-bold">Zones</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {zones.length} zone{zones.length > 1 ? "s" : ""} configurée{zones.length > 1 ? "s" : ""}
          </p>
          <Button className="w-full h-10 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setManagerOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer les zones
          </Button>
        </CardContent>
      </Card>

      <ZonesManagerDialog open={managerOpen} onClose={() => setManagerOpen(false)} />
    </>
  );
}
