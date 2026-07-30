import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Settings2 } from "lucide-react";
import AlertThresholdsDialog from "./AlertThresholdsDialog";

export default function AlertThresholdsCard() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card className="border-2 border-amber-500/40 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-amber-600" />
            </div>
            <span className="font-bold">Seuils d'alerte</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Vidange, assurance, visite technique, permis</p>
          <Button className="w-full h-10 rounded-lg font-bold bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer les seuils
          </Button>
        </CardContent>
      </Card>

      <AlertThresholdsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
