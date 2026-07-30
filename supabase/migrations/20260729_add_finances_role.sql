-- ============================================================================
-- Ajoute le rôle "finances" (traite la réception de facture et le paiement
-- des Commandes Garage — étapes désormais hors du périmètre du Responsable
-- Exploitation) à la contrainte de rôles de public.profiles.
-- ============================================================================

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles add constraint profiles_role_check
  check (role = ANY (ARRAY[
    'admin',
    'responsable_exploitation',
    'responsable_operations',
    'collecteur_bons',
    'executeur_depenses',
    'chauffeur',
    'finances'
  ]::text[]));
