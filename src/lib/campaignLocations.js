// Points de départ/destination d'une campagne. Point de départ : dépôt du
// client (table depots) ou môle du Port de Dakar (liste fixe ci-dessous).
// Destination : zone principale du client (id "zone_client:{clientId}") ou
// un de ses dépôts secondaires — jamais un môle (la marchandise part du port
// vers le client, jamais l'inverse). Partagé entre le formulaire de campagne
// (CampaignsList.jsx) et le rapport de clôture (CampaignReport.jsx) pour
// résoudre l'id stocké en libellé lisible.
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

export const ZONE_CLIENT_PREFIX = "zone_client:";

// Résout un id de point_origine/depot_destination_id (môle, dépôt client, ou
// zone principale d'un client) en libellé lisible. `depots` = résultat de
// supabase.from("depots").select("*"), `clients`/`zones` idem pour résoudre
// une zone principale (id "zone_client:{clientId}").
export function resolveLocationLabel(id, depots = [], clients = [], zones = []) {
  if (!id) return "—";
  if (id.startsWith(ZONE_CLIENT_PREFIX)) {
    const client = clients.find(c => c.id === id.slice(ZONE_CLIENT_PREFIX.length));
    if (!client) return "—";
    const zone = zones.find(z => z.code === client.zone);
    return `${client.nom} — Zone principale (${zone?.libelle || client.zone})`;
  }
  const mole = PORT_MOLES.find(m => m.id === id);
  if (mole) return mole.nom;
  const depot = depots.find(d => d.id === id);
  if (depot) return `${depot.nom_depot} — ${depot.zone}`;
  return "—";
}
