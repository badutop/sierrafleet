// Séquence fixe des statuts d'une campagne, et colonne d'horodatage associée
// à chacun (une campagne ne revisite jamais un statut déjà passé — voir
// migration 20260716_add_campaign_status_dates.sql). "creee" n'a pas de
// colonne dédiée : campaigns.created_date fait déjà foi.
// "validee_responsable"/"validee_operationnel" ont existé mais ne sont
// déclenchés par aucun bouton de l'appli — retirés de la séquence réelle.
export const STATUT_SEQUENCE = ["creee", "en_cours", "terminee", "clôturée"];

export const STATUT_DATE_COLUMN = {
  creee: "created_date",
  en_cours: "date_en_cours",
  terminee: "date_terminee",
  clôturée: "date_cloturee",
};

// Renvoie le patch à fusionner dans l'update d'une campagne pour horodater le
// passage au statut `newStatut`, sans écraser un horodatage déjà enregistré.
export function stampStatutDate(existingCampaign, newStatut) {
  const column = STATUT_DATE_COLUMN[newStatut];
  if (!column || column === "created_date") return {};
  if (existingCampaign?.[column]) return {};
  return { [column]: new Date().toISOString() };
}
