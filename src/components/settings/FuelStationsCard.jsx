import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, Settings2 } from "lucide-react";
import FuelStationsManagerDialog from "./FuelStationsManagerDialog";

// Stations d'essence de ravitaillement — nom, emplacement (coordonnées GPS)
// et téléphone du gérant, gérées en table complète dans
// FuelStationsManagerDialog (même modèle que ZonesSettingsCard).
export default function FuelStationsCard() {
  const { data: stations = [] } = useQuery({
    queryKey: ["fuel_stations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fuel_stations").select("*");
      if (error) throw error;
      return data;
    },
  });
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <>
      <Card className="border-2 border-orange-500/40 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
              <Fuel className="w-5 h-5 text-orange-600" />
            </div>
            <span className="font-bold">Les Stations d'essence</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {stations.length} station{stations.length > 1 ? "s" : ""} configurée{stations.length > 1 ? "s" : ""}
          </p>
          <Button className="w-full h-10 rounded-lg font-bold bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setManagerOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer les stations
          </Button>
        </CardContent>
      </Card>

      <FuelStationsManagerDialog open={managerOpen} onClose={() => setManagerOpen(false)} />
    </>
  );
}
