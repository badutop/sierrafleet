// Règle du refuel automatique : 3 rotations d'un même client ET d'un même
// camion, dont les 3 bons physiques ont été scannés à la saisie de la fiche
// du jour (RotationSheetEntry — la prédiction, position multiple de 3, s'y
// calcule aussi). Le camion devient alors éligible dans Carburant >
// Validation, seul endroit où la validation des bons (bon_physique_recu) se
// fait désormais, par le Responsable Exploitation ou Admin — Campagnes >
// Rotations n'affiche plus qu'un statut "À valider" passif, sans action
// possible. Le vrai fuel_entries n'est créé qu'au déclenchement du
// Rechargement Auto (scan de la pompe), pas automatiquement.
// Litrage approximatif par zone — désormais paramétrable (module Paramètres,
// table public.zones, voir hooks/use-zones.jsx) plutôt que codé en dur ici.
export function consoLitresPourClient(client, zones = []) {
  if (!client) return 9;
  const zone = zones.find(z => z.code === client.zone);
  return zone ? Number(zone.litrage_approximatif) : 9;
}

// Nombre de rotations déjà enregistrées pour ce couple (client, camion) dans
// la campagne — sert à prédire la position des nouvelles lignes à la saisie.
export function countExistingForClientVehicle(existingRotations, clientId, vehicleId) {
  return existingRotations.filter(r => r.client_id === clientId && r.vehicle_id === vehicleId).length;
}

// Renvoie tous les groupes de 3 rotations (même client + même camion) dont
// les 3 bons physiques sont scannés et dont la recharge réelle n'a pas
// encore eu lieu (checkpoint.fuel_entry_id vide) — pilote l'écran Carburant >
// Validation :
// - validated=false → camion éligible, en attente de validation (Resp.
//   Exploitation ou Admin) — c'est cette validation qui renseigne
//   bon_physique_recu sur les 3 rotations du groupe, pas Campagnes > Rotations.
// - validated=true  → camion validé, en attente de déclenchement du
//   rechargement auto (qui créera le vrai fuel_entries via scan de la pompe).
// Une fois la recharge réellement effectuée, fuel_entry_id est renseigné sur
// le checkpoint (voir PumpPhotoStep) et il disparaît de cette liste.
// Groupe de 3 rotations (même client) le plus ancien encore en attente de
// rechargement pour un véhicule donné, que les 3 bons soient déjà validés
// ou non — sert à l'écran de rechargement chauffeur (self-service) : les
// bons y sont uniquement affichés (avec leur statut de validation), le
// chauffeur ne peut poursuivre que lorsque les 3 sont validés (voir
// Carburant > Validation, seul endroit où cette validation se fait).
export function getPendingBonGroupForVehicle(allRotations, vehicleId) {
  const byClient = new Map();
  allRotations.forEach(r => {
    if (r.vehicle_id !== vehicleId || !r.client_id) return;
    if (!byClient.has(r.client_id)) byClient.set(r.client_id, []);
    byClient.get(r.client_id).push(r);
  });

  let best = null;
  byClient.forEach(list => {
    const sorted = [...list].sort((a, b) => (a.numero_rotation || 0) - (b.numero_rotation || 0));
    for (let i = 2; i < sorted.length; i += 3) {
      const chunk = sorted.slice(i - 2, i + 1);
      if (chunk[2].fuel_entry_id) continue; // déjà rechargé, groupe suivant
      if (!best || new Date(chunk[0].date_rotation || 0) < new Date(best[0].date_rotation || 0)) {
        best = chunk;
      }
      break; // un seul groupe "en cours" par client à la fois
    }
  });
  return best; // [rotation1, rotation2, rotation3] | null
}

export function getRefuelCheckpoints(allRotations) {
  const pairs = new Map();
  allRotations.forEach(r => {
    if (!r.client_id || !r.vehicle_id) return;
    const key = `${r.client_id}::${r.vehicle_id}`;
    if (!pairs.has(key)) pairs.set(key, { clientId: r.client_id, vehicleId: r.vehicle_id });
  });

  const checkpoints = [];
  pairs.forEach(({ clientId, vehicleId }) => {
    const group = allRotations
      .filter(r => r.client_id === clientId && r.vehicle_id === vehicleId)
      .sort((a, b) => (a.numero_rotation || 0) - (b.numero_rotation || 0));
    for (let i = 2; i < group.length; i += 3) {
      const chunk = group.slice(i - 2, i + 1);
      if (chunk.every(r => r.bon_physique_scan_url) && !chunk[2].fuel_entry_id) {
        checkpoints.push({ clientId, vehicleId, rotations: chunk, checkpoint: chunk[2], validated: !!chunk[2].refuel_effectue });
      }
    }
  });
  return checkpoints;
}
