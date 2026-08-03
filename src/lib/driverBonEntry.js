// Logique du nouveau flux "saisie fiche du jour par le chauffeur"
// (togglable — voir DriverBonEntryToggleCard.jsx). Volontairement séparé
// de RotationSheetEntry.jsx et FuelValidationTab.jsx : ces deux fichiers
// restent strictement inchangés pour que l'ancien flux reste utilisable à
// tout moment en repassant simplement le réglage sur OFF.
import { supabase } from "@/lib/supabaseClient";
import { getRefuelCheckpoints, consoLitresPourClient } from "@/lib/refuelRules";
import { logAudit } from "@/lib/auditLog";

export const DRIVER_BON_ENTRY_KEY = "chauffeur_saisie_bon_actif";

// Construit le payload d'insertion d'une rotation depuis ce nouveau flux —
// même forme exacte que le payload construit dans RotationSheetEntry.jsx
// (dupliqué plutôt qu'importé, volontairement, voir en-tête de fichier).
export function buildDriverRotationPayload({
  campaignId, vehicleId, clientId, driverId,
  numeroRotation, numeroBonClient, poidsTonnes, litresAlloues,
  refuelDeclenche, bonScanUrl,
}) {
  return {
    id: crypto.randomUUID(),
    campaign_id: campaignId,
    vehicle_id: vehicleId,
    client_id: clientId,
    driver_id: driverId || null,
    numero_rotation: numeroRotation,
    numero_bon_client: numeroBonClient || "",
    date_rotation: new Date().toISOString(),
    poids_charge_tonnes: Number(poidsTonnes),
    litres_carburant_alloues: litresAlloues,
    refuel_declenche: refuelDeclenche,
    bon_physique_scan_url: bonScanUrl || null,
    bon_physique_recu: false,
    statut: "livree",
  };
}

// Après insertion d'une nouvelle rotation, vérifie si son couple
// (client, véhicule) vient de compléter un groupe de 3 bons scannés pas
// encore validé — si oui, reproduit exactement les mutations que le
// Responsable Exploitation ferait manuellement dans Carburant >
// Validation (FuelValidationTab.jsx), sans intervention humaine :
// bon_physique_recu sur les 3 rotations, refuel_effectue + litres_valides
// (théorique — plus personne ne l'ajuste dans ce flux) sur la 3e. Cette
// validation devient un contrôle a posteriori pour Resp. Opérations/
// Exploitation (Carburant > Validation affiche déjà l'état "validé").
// `allRotationsAfterInsert` doit inclure la rotation qui vient d'être créée.
//
// Retourne l'id de la rotation-checkpoint (3e du groupe) si l'auto-
// validation a eu lieu, sinon null — cet id est le même
// `checkpointRotationId` que AutoRefuelFlow.jsx sait déjà consommer
// (déclenché jusqu'ici uniquement par Admin depuis Carburant > Validation)
// pour sauter directement à l'étape pompe, sans repasser par le scan des
// bons ni leur récapitulatif (déjà faits/inutiles à ce stade).
export async function maybeAutoValidateCheckpoint({ allRotationsAfterInsert, clientId, vehicleId, client, zones }) {
  const checkpoints = getRefuelCheckpoints(allRotationsAfterInsert);
  const match = checkpoints.find(cp => cp.clientId === clientId && cp.vehicleId === vehicleId && !cp.validated);
  if (!match) return null;

  const rotationIds = match.rotations.map(r => r.id);
  const litresValides = consoLitresPourClient(client, zones) * 3;

  const { error: bonError } = await supabase.from("rotations").update({ bon_physique_recu: true }).in("id", rotationIds);
  if (bonError) throw bonError;

  const payload = { refuel_effectue: true, litres_valides: litresValides };
  const { error: refuelError } = await supabase.from("rotations").update(payload).eq("id", match.checkpoint.id);
  if (refuelError) throw refuelError;

  await logAudit(
    "Carburant",
    match.checkpoint.id,
    "update",
    { ...payload, bon_physique_recu: true, valide_automatiquement: true },
    null,
    [...Object.keys(payload), "bon_physique_recu"]
  );
  return match.checkpoint.id;
}

// Tolérance au-delà de laquelle un écart de poids entre le bon d'enlèvement
// et le bon de déchargement est considéré comme un vrai écart plutôt qu'un
// simple arrondi/pesée différente selon les balances.
const POIDS_ECART_TOLERANCE_TONNES = 0.5;

// Comparaison automatique bon d'enlèvement vs bon de déchargement — utilisée
// par CollecteurBonsPage.jsx (togglable) pour remplacer la comparaison à
// l'œil que faisait le Collecteur : ce n'est plus qu'un contrôle a
// posteriori pour les Responsables des Opérations/Exploitation.
export function computeBonFinalEcart({ poidsBonFinal, numeroBonFinal, poidsEnlevement, numeroEnlevement }) {
  const diffs = [];

  if (poidsBonFinal != null) {
    const ecartPoids = Math.abs(Number(poidsBonFinal) - Number(poidsEnlevement || 0));
    if (ecartPoids > POIDS_ECART_TOLERANCE_TONNES) {
      diffs.push(`Poids : ${Number(poidsBonFinal).toFixed(2)} T (déchargement) vs ${Number(poidsEnlevement || 0).toFixed(2)} T (enlèvement)`);
    }
  }

  const numFinal = (numeroBonFinal || "").trim().toLowerCase();
  const numEnlev = (numeroEnlevement || "").trim().toLowerCase();
  if (numFinal && numEnlev && numFinal !== numEnlev) {
    diffs.push(`N° de bon : ${numeroBonFinal} (déchargement) vs ${numeroEnlevement} (enlèvement)`);
  }

  return {
    ecart: diffs.length > 0,
    observation: diffs.length ? `Écart détecté automatiquement — ${diffs.join(" · ")}` : "",
  };
}
