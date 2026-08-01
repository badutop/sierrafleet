// Formate au fil de la saisie au format sénégalais "+221 XX XXX XX XX" (9
// chiffres, groupés 2-3-2-2) — ne garde que les chiffres tapés après
// l'indicatif, qui reste fixe en tête, quoi que l'utilisateur édite.
export function formatSenegalPhone(raw) {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("221")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const groups = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return "+221" + (groups.length ? " " + groups.join(" ") : "");
}

// true si un champ formaté par formatSenegalPhone ne contient aucun chiffre
// réellement saisi au-delà du seul indicatif — pour éviter d'enregistrer un
// "+221" orphelin en base.
export function isBlankSenegalPhone(value) {
  return !(value || "").replace("+221", "").replace(/\D/g, "");
}
