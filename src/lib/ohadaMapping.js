// Correspondance entre les données de l'appli et le plan comptable SYSCOHADA
// révisé (classe 6 = charges, classe 7 = produits), pour le module Déversement.
// Chaque source de charge/produit n'a qu'un seul compte — pas de ventilation
// pièces/main d'œuvre ni de gestion de la TVA (hors périmètre demandé).

export const COMPTE_CARBURANT = { code: "605", libelle: "Carburants et lubrifiants" };
export const COMPTE_ENTRETIEN = { code: "624", libelle: "Entretien, réparations et maintenance" };
export const COMPTE_TRANSPORT = { code: "618", libelle: "Autres frais de transport (péages, etc.)" };
export const COMPTE_PERSONNEL_INDEMNITES = { code: "6414", libelle: "Indemnités et avantages divers (rations)" };
export const COMPTE_PENALITES = { code: "6586", libelle: "Pénalités et amendes fiscales et pénales" };
export const COMPTE_CHARGES_DIVERSES = { code: "658", libelle: "Charges diverses de gestion courante" };
export const COMPTE_PRESTATIONS_TRANSPORT = { code: "706", libelle: "Services vendus (prestations de transport)" };

// expenses.type_frais -> compte
export const EXPENSE_TYPE_COMPTE = {
  carburant: COMPTE_CARBURANT,
  peage: COMPTE_TRANSPORT,
  rations: COMPTE_PERSONNEL_INDEMNITES,
  contravention: COMPTE_PENALITES,
  transport: COMPTE_TRANSPORT,
  autre: COMPTE_CHARGES_DIVERSES,
};

const EXPENSE_TYPE_LABELS = { carburant: "Carburant", peage: "Péage", rations: "Rations", contravention: "Contravention", transport: "Transport", autre: "Autre" };

// Construit la liste unifiée des écritures (charges + produits) à partir des
// données déjà chargées par la page. Chaque ligne : une seule transaction
// source (une dépense, un entretien, un plein, une rotation facturable).
export function buildDeversementLines({ expenses = [], maintenances = [], fuelEntries = [], rotations = [], campaigns = [], clients = [], vehicles = [] }) {
  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));
  const lines = [];

  // Charges — Journal des dépenses (uniquement les dépenses validées)
  expenses
    .filter(e => e.statut === "valide" && Number(e.montant) > 0)
    .forEach(e => {
      const compte = EXPENSE_TYPE_COMPTE[e.type_frais] || COMPTE_CHARGES_DIVERSES;
      const vehicle = vMap[e.vehicle_id];
      lines.push({
        date: e.date_frais,
        nature: "Charge",
        compte,
        categorie: EXPENSE_TYPE_LABELS[e.type_frais] || "Autre",
        description: [vehicle?.immatriculation, e.description].filter(Boolean).join(" — ") || "—",
        montant: Number(e.montant),
        source: "Journal des dépenses",
      });
    });

  // Charges — Entretien / Réparations (maintenance table, uniquement réalisées)
  maintenances
    .filter(m => m.statut === "realise" && Number(m.cout) > 0)
    .forEach(m => {
      const vehicle = vMap[m.vehicle_id];
      lines.push({
        date: m.date_entretien,
        nature: "Charge",
        compte: COMPTE_ENTRETIEN,
        categorie: m.categorie === "corrective" ? "Réparation" : "Entretien préventif",
        description: [vehicle?.immatriculation, m.type_entretien, m.prestataire].filter(Boolean).join(" — ") || "—",
        montant: Number(m.cout),
        source: m.categorie === "corrective" ? "Réparations" : "Maintenance",
      });
    });

  // Charges — Carburant (fuel_entries, uniquement validés)
  fuelEntries
    .filter(f => f.statut === "valide" && Number(f.montant_total) > 0)
    .forEach(f => {
      const vehicle = vMap[f.vehicle_id];
      lines.push({
        date: f.date,
        nature: "Charge",
        compte: COMPTE_CARBURANT,
        categorie: "Carburant",
        description: [vehicle?.immatriculation, f.station].filter(Boolean).join(" — ") || "—",
        montant: Number(f.montant_total),
        source: "Carburant",
      });
    });

  // Produits — Prestations de transport (tonnage livré × tarif client, par rotation)
  rotations
    .filter(r => r.statut !== "annulee" && Number(r.poids_charge_tonnes) > 0)
    .forEach(r => {
      const campaign = campaignMap[r.campaign_id];
      const clientId = r.client_id || campaign?.client_id;
      const client = clientMap[clientId];
      const tarif = Number(client?.tarif_par_tonne) || 0;
      if (tarif <= 0) return;
      const montant = Number(r.poids_charge_tonnes) * tarif;
      lines.push({
        date: r.date_rotation,
        nature: "Produit",
        compte: COMPTE_PRESTATIONS_TRANSPORT,
        categorie: "Prestation transport",
        description: [campaign?.nom_campagne, client?.nom, r.numero_rotation ? `Rotation #${r.numero_rotation}` : null].filter(Boolean).join(" — ") || "—",
        montant,
        source: "Facturation campagne",
      });
    });

  return lines
    .map(l => ({ ...l, date: l.date ? new Date(l.date).toISOString().split("T")[0] : null }))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}
