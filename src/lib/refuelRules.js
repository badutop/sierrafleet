// Règle du refuel automatique : 3 rotations d'un même client ET d'un même
// camion, dont les 3 bons physiques ont été effectivement collectés. La
// prédiction (position multiple de 3) se calcule à la saisie de la fiche du
// jour (RotationSheetEntry) ; le déclenchement réel se fait à la collecte du
// bon physique (CampaignRotationsTable), pas avant.
export const ZONE_CONSO_LITRES = { zone1: 9, zone2: 25, zone3: 30, zone4: 40 };

export function consoLitresPourClient(client) {
  return client ? (ZONE_CONSO_LITRES[client.zone] || 9) : 9;
}

// Nombre de rotations déjà enregistrées pour ce couple (client, camion) dans
// la campagne — sert à prédire la position des nouvelles lignes à la saisie.
export function countExistingForClientVehicle(existingRotations, clientId, vehicleId) {
  return existingRotations.filter(r => r.client_id === clientId && r.vehicle_id === vehicleId).length;
}

// Cherche, parmi toutes les rotations d'une campagne, un groupe de 3
// rotations (même client + même camion) dont les 3 bons physiques sont
// reçus mais dont le refuel n'a pas encore été effectué. Retourne la
// rotation de clôture du groupe (la 3e) si trouvée, sinon null.
export function findRefuelCheckpoint(allRotations, clientId, vehicleId) {
  const group = allRotations
    .filter(r => r.client_id === clientId && r.vehicle_id === vehicleId)
    .sort((a, b) => (a.numero_rotation || 0) - (b.numero_rotation || 0));
  for (let i = 2; i < group.length; i += 3) {
    const chunk = group.slice(i - 2, i + 1);
    const checkpoint = chunk[2];
    if (chunk.every(r => r.bon_physique_recu) && !checkpoint.refuel_effectue) {
      return checkpoint;
    }
  }
  return null;
}
