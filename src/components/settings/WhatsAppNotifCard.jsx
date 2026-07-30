import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Settings2 } from "lucide-react";
import WhatsAppNotifDialog from "./WhatsAppNotifDialog";

export default function WhatsAppNotifCard() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: setting } = useQuery({
    queryKey: ["app_settings", "wa_alert_phone"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("key", "wa_alert_phone").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const count = (setting?.value || "").split(",").map(n => n.trim()).filter(Boolean).length;

  return (
    <>
      <Card className="border-secondary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="w-4 h-4 text-secondary" />Notifications WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {count > 0 ? `${count} numéro${count > 1 ? "s" : ""} configuré${count > 1 ? "s" : ""}` : "Aucun numéro configuré"}
          </p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer les numéros
          </Button>
        </CardContent>
      </Card>

      <WhatsAppNotifDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
