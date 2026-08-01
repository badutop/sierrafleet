// Message clair quand une suppression est bloquée par une contrainte de clé
// étrangère (ON DELETE RESTRICT) — plutôt que l'erreur Postgres brute, peu
// compréhensible pour un utilisateur (ex: "update or delete on table
// \"vehicles\" violates foreign key constraint...").
export function friendlyDeleteError(error, entityLabel) {
  if (error?.code === "23503") {
    return `Impossible de supprimer ${entityLabel} : encore utilisé ailleurs dans l'application (rotations, campagnes, maintenances, carburant...)`;
  }
  return `Erreur lors de la suppression : ${error?.message || "erreur inconnue"}`;
}

// Même principe pour un enregistrement (création/modification) bloqué par
// une contrainte d'unicité (ex: immatriculation ou n° de permis déjà pris
// par un autre véhicule/chauffeur) — code Postgres 23505.
export function friendlySaveError(error, duplicateFieldLabel) {
  if (error?.code === "23505") {
    return `${duplicateFieldLabel} est déjà utilisé par un autre enregistrement`;
  }
  return `Erreur lors de l'enregistrement : ${error?.message || "erreur inconnue"}`;
}
