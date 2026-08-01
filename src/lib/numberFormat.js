// Affichage/saisie d'un montant FCFA avec espace comme séparateur des
// milliers (ex: 15 000) — la valeur stockée en state reste un nombre brut,
// seul l'affichage passe par toLocaleString("fr-FR").
export function displayThousands(value) {
  return value != null && value !== "" ? Number(value).toLocaleString("fr-FR") : "";
}

export function parseThousandsInput(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}
