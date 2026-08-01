// Validation simple de format email (pas de vérification d'existence du
// domaine — juste la forme "texte@texte.texte") pour compléter le seul
// type="email" HTML5, qui n'empêche pas la soumission via Entrée sur
// certains navigateurs/claviers mobiles et ne bloque pas un onClick direct.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test((value || "").trim());
}
