// Logique du nouveau flux "saisie fiche du jour par le chauffeur"
// (togglable — voir DriverBonEntryToggleCard.jsx). Volontairement séparé de
// RotationSheetEntry.jsx, qui reste strictement inchangé pour que l'ancien
// flux reste utilisable à tout moment en repassant simplement le réglage
// sur OFF. FuelValidationTab.jsx a un seul point d'accroche additif
// (canTriggerRecharge, gardé derrière ce même réglage — voir ce fichier).
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

// Groupe de rotations (client, véhicule) courant — le plus ancien pas
// encore rechargé (chunk[2].fuel_entry_id vide). Un groupe déjà rechargé
// est "consommé" ; on repart à zéro pour le suivant. Factorisé hors de
// getDriverCycleState pour que DriverBonFinalEntryFlow.jsx puisse aussi
// savoir si un bon de déchargement vient de compléter le groupe, sans
// dépendre du statut de validation (voir cet appelant).
function getCurrentGroup(rotations, clientId, vehicleId) {
  const sorted = rotations
    .filter(r => r.client_id === clientId && r.vehicle_id === vehicleId)
    .sort((a, b) => (a.numero_rotation || 0) - (b.numero_rotation || 0));

  let group = [];
  for (const r of sorted) {
    group.push(r);
    if (group.length === 3) {
      if (group[2].fuel_entry_id) {
        group = []; // groupe déjà rechargé : repart à zéro pour le suivant
      } else {
        break; // groupe courant, pas encore rechargé
      }
    }
  }
  return group;
}

// Vrai si les 3 rotations du groupe courant ont chacune leur bon
// d'enlèvement ET leur bon de déchargement — indépendamment du statut de
// validation (refuel_effectue). Utilisé par DriverBonFinalEntryFlow.jsx
// pour savoir si le bon qu'il vient d'enregistrer complète le groupe (donc
// s'il faut tenter l'auto-validation, ou laisser la main au Responsable des
// Opérations selon l'heure — voir isWithinManualValidationHours).
export function isGroupFullyDocumented(rotations, clientId, vehicleId) {
  const group = getCurrentGroup(rotations, clientId, vehicleId);
  return group.length === 3 && group.every(r => r.bon_physique_scan_url && r.bon_final_scan_url);
}

// Détermine la seule action que le chauffeur doit voir sur son écran
// d'accueil (voir DriverRefuelPage.jsx) : un cycle "enlèvement → livraison/
// bon de déchargement" par rotation, répété 3 fois, puis rechargement — le
// chauffeur se déconnecte (et l'app vide son cache) après chaque étape, donc
// à chaque connexion il ne doit voir qu'un seul bouton, celui de l'étape où
// il en est.
//
// Dans le groupe courant (voir getCurrentGroup) :
//   - la dernière rotation a un bon d'enlèvement mais pas de bon de
//     déchargement → il reste à scanner ce bon de déchargement.
//   - le groupe a moins de 3 rotations → il reste à scanner un bon
//     d'enlèvement (nouvelle rotation).
//   - le groupe a ses 3 rotations, chacune avec les deux bons, mais pas
//     encore validé (refuel_effectue) → en attente de validation (auto ou
//     par le Responsable des Opérations).
//   - validé → le rechargement est possible.
export function getDriverCycleState(rotations, clientId, vehicleId) {
  const group = getCurrentGroup(rotations, clientId, vehicleId);
  const last = group[group.length - 1];
  if (last && last.bon_physique_scan_url && !last.bon_final_scan_url) {
    return { action: "discharge", rotationId: last.id };
  }
  if (group.length < 3) {
    return { action: "pickup" };
  }
  // Les 3 bons de déchargement sont là, mais le checkpoint n'est pas encore
  // validé (refuel_effectue) : soit l'auto-validation n'a pas eu lieu car
  // hors de la fenêtre autorisée (voir isWithinManualValidationHours), soit
  // le Responsable des Opérations n'a pas encore validé manuellement dans
  // Carburant > Validation. Le chauffeur ne peut rien faire de plus pour
  // l'instant.
  if (!group[2].refuel_effectue) {
    return { action: "waiting_validation" };
  }
  return { action: "refuel", checkpointRotationId: group[2].id };
}

// Fenêtre horaire pendant laquelle la validation du refuel (3e bon de
// déchargement complété) doit rester manuelle — faite par le Responsable
// des Opérations dans Carburant > Validation — plutôt qu'automatique.
// L'auto-validation devient ainsi l'exception (nuit/tôt le matin, quand
// personne n'est disponible pour valider), pas la règle par défaut.
export function isWithinManualValidationHours(date = new Date()) {
  const hour = date.getHours();
  return hour >= 9 && hour < 20;
}
