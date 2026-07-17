// Points de départ/destination d'une campagne : soit un dépôt du client
// (table depots), soit un môle du Port de Dakar (liste fixe ci-dessous).
// Partagé entre le formulaire de campagne (CampaignsList.jsx) et le rapport
// de clôture (CampaignReport.jsx) pour résoudre l'id stocké en libellé lisible.
export const PORT_MOLES = [
  { id: "mole_1", nom: "Môle 1 - Port de Dakar" },
  { id: "mole_2", nom: "Môle 2 - Port de Dakar" },
  { id: "mole_3", nom: "Môle 3 - Port de Dakar" },
  { id: "mole_4", nom: "Môle 4 - Port de Dakar" },
  { id: "mole_5", nom: "Môle 5 - Port de Dakar" },
  { id: "mole_6", nom: "Môle 6 - Port de Dakar" },
  { id: "mole_7", nom: "Môle 7 - Port de Dakar" },
  { id: "mole_8", nom: "Môle 8 - Port de Dakar" },
  { id: "port_dakar", nom: "Port de Dakar (Général)" },
];

// Résout un id de point_origine/depot_destination_id (môle ou dépôt client)
// en libellé lisible. `depots` = résultat de supabase.from("depots").select("*").
export function resolveLocationLabel(id, depots = []) {
  if (!id) return "—";
  const mole = PORT_MOLES.find(m => m.id === id);
  if (mole) return mole.nom;
  const depot = depots.find(d => d.id === id);
  if (depot) return `${depot.nom_depot} — ${depot.zone}`;
  return "—";
}
