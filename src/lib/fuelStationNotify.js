// Dès qu'un rechargement est validé — par le système (auto-validation hors
// 9h-20h) ou manuellement par le Responsable de l'Exploitation (Carburant >
// Validation) — un message WhatsApp est envoyé à tous les gérants de
// station essence enregistrés (fuel_stations.telephone_gerant), pour
// autoriser le chauffeur à recharger sans savoir à l'avance dans quelle
// station il se présentera. Message personnalisé par station (nom + tél. en
// premier, pour que le gérant identifie immédiatement à qui il s'adresse).
// Best-effort : un échec d'envoi n'empêche jamais la validation elle-même
// de réussir.
import { supabase } from "@/lib/supabaseClient";

// Evolution API a besoin de l'indicatif pays en tête (ex: "221771234567",
// chiffres seuls) pour résoudre un contact WhatsApp — telephone_gerant est
// un champ libre (FuelStationFormDialog.jsx ne force pas ce format), donc
// certains numéros saisis sans le "+221" ne partaient jamais réellement.
function toWhatsAppDigits(raw) {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (!digits.startsWith("221")) digits = "221" + digits;
  return digits;
}

export async function notifyFuelStationsAuthorized({ vehicleImmat, driverId, litres }) {
  try {
    const [{ data: stations, error: stationsError }, driverRes] = await Promise.all([
      supabase.from("fuel_stations").select("nom, telephone_gerant"),
      driverId
        ? supabase.from("drivers").select("prenom, nom").eq("id", driverId).single()
        : Promise.resolve({ data: null }),
    ]);
    if (stationsError) throw stationsError;
    const driverName = driverRes?.data ? `${driverRes.data.prenom} ${driverRes.data.nom}` : null;

    const now = new Date();
    const dateHeure = `${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

    await Promise.all(
      stations.filter(s => s.telephone_gerant).map(async (station) => {
        const phone = toWhatsAppDigits(station.telephone_gerant);
        if (!phone) return;

        const message =
          `⛽ *Autorisation de rechargement*\n\n` +
          `🏪 Station : ${station.nom}\n` +
          `📞 Tél : ${station.telephone_gerant}\n\n` +
          `🚛 Véhicule : ${vehicleImmat || "—"}${driverName ? ` — ${driverName}` : ""}\n` +
          `🔢 Litres autorisés : ${litres} L\n` +
          `📅 ${dateHeure}\n\n` +
          `Le chauffeur est autorisé à recharger.`;

        const { data, error: fnError } = await supabase.functions.invoke("whatsapp-notify", { body: { phone, message } });
        if (fnError || data?.success === false) {
          console.error("[notifyFuelStationsAuthorized]", station.nom, fnError || data);
        }
      })
    );
  } catch (err) {
    console.error("[notifyFuelStationsAuthorized]", err);
  }
}
