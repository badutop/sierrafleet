import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Settings2 } from "lucide-react";
import AlertThresholdsDialog from "./AlertThresholdsDialog";

export default function AlertThresholdsCard() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Settings className="w-4 h-4" />Seuils d'alerte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Vidange, assurance, visite technique, permis</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer les seuils
          </Button>
        </CardContent>
      </Card>

      <AlertThresholdsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
