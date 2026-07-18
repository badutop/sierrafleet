// Règle du refuel automatique : 3 rotations d'un même client ET d'un même
// camion, dont les 3 bons physiques ont été effectivement collectés. La
// prédiction (position multiple de 3) se calcule à la saisie de la fiche du
// jour (RotationSheetEntry). Une fois les 3 bons confirmés (CampaignRotations
// Table), le camion devient éligible dans Carburant > Validation ; le vrai
// fuel_entries n'est créé qu'au déclenchement du Rechargement Auto (scan des
// bons + de la pompe), pas automatiquement.
export const ZONE_CONSO_LITRES = { zone1: 9, zone2: 25, zone3: 30, zone4: 40 };

export function consoLitresPourClient(client) {
  return client ? (ZONE_CONSO_LITRES[client.zone] || 9) : 9;
}

// Nombre de rotations déjà enregistrées pour ce couple (client, camion) dans
// la campagne — sert à prédire la position des nouvelles lignes à la saisie.
export function countExistingForClientVehicle(existingRotations, clientId, vehicleId) {
  return existingRotations.filter(r => r.client_id === clientId && r.vehicle_id === vehicleId).length;
}

// Renvoie tous les groupes de 3 rotations (même client + même camion) dont
// les 3 bons physiques sont confirmés et dont la recharge réelle n'a pas
// encore eu lieu (checkpoint.fuel_entry_id vide) — pilote l'écran Carburant >
// Validation :
// - validated=false → camion éligible, en attente de validation
// - validated=true  → camion validé, en attente de déclenchement du
//   rechargement auto (qui créera le vrai fuel_entries via scan des bons).
// Une fois la recharge réellement effectuée, fuel_entry_id est renseigné sur
// le checkpoint (voir PumpPhotoStep) et il disparaît de cette liste.
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
      if (chunk.every(r => r.bon_physique_recu) && !chunk[2].fuel_entry_id) {
        checkpoints.push({ clientId, vehicleId, rotations: chunk, checkpoint: chunk[2], validated: !!chunk[2].refuel_effectue });
      }
    }
  });
  return checkpoints;
}
