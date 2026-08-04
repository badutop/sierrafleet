// Dès qu'un rechargement est validé — par le système (auto-validation hors
// 9h-20h) ou manuellement par le Responsable de l'Exploitation (Carburant >
// Validation) — un message WhatsApp est envoyé à tous les gérants de
// station essence enregistrés (fuel_stations.telephone_gerant), pour
// autoriser le chauffeur à recharger sans savoir à l'avance dans quelle
// station il se présentera. Best-effort : un échec d'envoi n'empêche jamais
// la validation elle-même de réussir.
import { supabase } from "@/lib/supabaseClient";

export async function notifyFuelStationsAuthorized({ vehicleImmat, litres, clientName }) {
  try {
    const { data: stations, error } = await supabase.from("fuel_stations").select("telephone_gerant");
    if (error) throw error;
    const phones = stations.map(s => s.telephone_gerant).filter(Boolean).join(",");
    if (!phones) return;

    const message =
      `⛽ *Autorisation de rechargement*\n\n` +
      `🚛 Véhicule : ${vehicleImmat || "—"}\n` +
      (clientName ? `📦 Client : ${clientName}\n` : "") +
      `🔢 Litres autorisés : ${litres} L\n\n` +
      `Le chauffeur est autorisé à recharger.`;

    const { data, error: fnError } = await supabase.functions.invoke("whatsapp-notify", { body: { phone: phones, message } });
    if (fnError || data?.success === false) {
      console.error("[notifyFuelStationsAuthorized]", fnError || data);
    }
  } catch (err) {
    console.error("[notifyFuelStationsAuthorized]", err);
  }
}
