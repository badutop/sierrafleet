import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

// Zones paramétrables depuis Paramètres (voir ZonesSettingsCard) — utilisées
// par Clients/Dépôts pour estimer la consommation carburant par rotation.
export function useZones() {
  return useQuery({
    queryKey: ["zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("zones").select("*").order("numero", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
