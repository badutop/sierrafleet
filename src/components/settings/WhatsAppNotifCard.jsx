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
      <Card className="border-2 border-emerald-500/40 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="font-bold">Notifications WhatsApp</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {count > 0 ? `${count} numéro${count > 1 ? "s" : ""} configuré${count > 1 ? "s" : ""}` : "Aucun numéro configuré"}
          </p>
          <Button className="w-full h-10 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" /> Gérer les numéros
          </Button>
        </CardContent>
      </Card>

      <WhatsAppNotifDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
