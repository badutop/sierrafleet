import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logAudit } from "@/lib/auditLog";

// Lecture/écriture d'une clé app_settings — même convention que
// wa_alert_phone (WhatsAppNotifDialog.jsx) : une ligne { key, value } par
// réglage, update-si-existe sinon insert.
export function useAppSetting(key) {
  return useQuery({
    queryKey: ["app_settings", key],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("key", key).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSetAppSetting(key) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ value, setting }) => {
      if (setting) {
        const { error } = await supabase.from("app_settings").update({ value, updated_date: new Date().toISOString() }).eq("id", setting.id);
        if (error) throw error;
        await logAudit("Paramètre", setting.id, "update", { value }, { value: setting.value }, ["value"]);
      } else {
        const id = crypto.randomUUID();
        const { error } = await supabase.from("app_settings").insert({ id, key, value });
        if (error) throw error;
        await logAudit("Paramètre", id, "create", { key, value });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app_settings", key] }),
  });
}

// Un réglage booléen stocké comme la chaîne "true"/"false".
export function isSettingOn(setting) {
  return setting?.value === "true";
}
