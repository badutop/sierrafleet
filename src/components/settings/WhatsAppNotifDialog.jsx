import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";

const WA_ALERT_PHONE_KEY = "wa_alert_phone";

async function fetchWaSetting() {
  const { data, error } = await supabase.from("app_settings").select("*").eq("key", WA_ALERT_PHONE_KEY).maybeSingle();
  if (error) throw error;
  return data;
}

// Numéro(s) qui reçoivent les notifications WhatsApp automatiques (récap de
// rechargement carburant envoyé par le chauffeur, alertes documents/vidange)
// — un ou plusieurs numéros, stockés séparés par des virgules dans
// app_settings.wa_alert_phone (voir supabase/functions/_shared/evolution.ts).
export default function WhatsAppNotifDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [numbers, setNumbers] = useState([""]);

  const { data: setting } = useQuery({
    queryKey: ["app_settings", WA_ALERT_PHONE_KEY],
    queryFn: fetchWaSetting,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      const parsed = (setting?.value || "").split(",").map(n => n.trim()).filter(Boolean);
      setNumbers(parsed.length ? parsed : [""]);
    }
  }, [open, setting]);

  const saveMutation = useMutation({
    mutationFn: async (numbersArr) => {
      const value = numbersArr.map(n => n.trim()).filter(Boolean).join(",");
      if (setting) {
        const { error } = await supabase.from("app_settings").update({ value, updated_date: new Date().toISOString() }).eq("id", setting.id);
        if (error) throw error;
        await logAudit("Paramètre", setting.id, "update", { value }, { value: setting.value }, ["value"]);
      } else {
        const id = crypto.randomUUID();
        const { error } = await supabase.from("app_settings").insert({ id, key: WA_ALERT_PHONE_KEY, value });
        if (error) throw error;
        await logAudit("Paramètre", id, "create", { key: WA_ALERT_PHONE_KEY, value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings", WA_ALERT_PHONE_KEY] });
      toast.success("Numéros de notification enregistrés");
      onClose();
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const updateNumber = (i, value) => setNumbers(prev => prev.map((n, idx) => idx === i ? value : n));
  const addNumber = () => setNumbers(prev => [...prev, ""]);
  const removeNumber = (i) => setNumbers(prev => prev.filter((_, idx) => idx !== i));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="-mx-6 -mt-6 mb-2 px-5 py-4 bg-primary text-primary-foreground rounded-t-lg flex items-center gap-2.5">
          <MessageCircle className="w-5 h-5 text-secondary shrink-0" />
          <DialogTitle className="text-base font-bold text-primary-foreground leading-none tracking-tight">
            Notifications WhatsApp
          </DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Ces numéros reçoivent le récap de rechargement carburant (envoyé quand un chauffeur termine un rechargement) et les alertes documents/vidange.
        </p>

        <div className="space-y-3 mt-2">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />Numéros destinataires</p>
            <div className="space-y-2">
              {numbers.map((n, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    className="bg-card"
                    placeholder="Ex: +221771234567"
                    value={n}
                    onChange={e => updateNumber(i, e.target.value)}
                  />
                  <Button
                    type="button" size="sm" variant="outline" className="h-9 px-2 text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => removeNumber(i)} disabled={numbers.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={addNumber}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un numéro
            </Button>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-base font-bold" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            onClick={() => saveMutation.mutate(numbers)}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
