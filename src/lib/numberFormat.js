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

// toLocaleString("fr-FR")/Intl.NumberFormat("fr-FR") séparent les milliers
// par une espace fine insécable (U+202F) — quasi invisible une fois le texte
// en gras/très gras, surtout sur les gros montants (les StatCards du
// Tableau de bord, totaux Carburant/Garage/Maintenance...), où les groupes
// de chiffres finissent par se lire comme un seul bloc. On la remplace par
// une espace insécable normale (U+00A0, ~2x plus large), nettement plus
// lisible sans changer la convention française (toujours une espace, pas un
// autre caractère) ni risquer un retour à la ligne au milieu du nombre.
export function formatFCFA(n, { suffix = " FCFA" } = {}) {
  const formatted = new Intl.NumberFormat("fr-FR").format(Math.round(n) || 0).replace(/ /g, " ");
  return `${formatted}${suffix}`;
}

// Alias sans suffixe monétaire, pour les gros nombres en gras qui ne sont
// pas des montants FCFA (km, litres...) — même séparateur plus lisible.
export const formatNumber = (n) => formatFCFA(n, { suffix: "" });
