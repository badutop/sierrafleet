-- ============================================================================
-- Empêche un doublon d'immatriculation véhicule ou de n° de permis chauffeur
-- en base — jusqu'ici rien ne l'empêchait. Vérifié au préalable : aucun
-- doublon existant sur les deux colonnes, les contraintes s'appliquent donc
-- sans nettoyage de données au préalable.
--
-- numero_permis reste nullable (permis pas encore renseigné) : NULL n'est
-- jamais considéré comme un doublon par une contrainte UNIQUE Postgres,
-- plusieurs chauffeurs peuvent donc avoir ce champ vide simultanément.
-- L'unicité de l'email utilisateur est déjà garantie par Supabase Auth
-- lui-même (auth.users.email), pas besoin d'une contrainte supplémentaire.
-- ============================================================================

alter table public.vehicles
  add constraint vehicles_immatriculation_key unique (immatriculation);

alter table public.drivers
  add constraint drivers_numero_permis_key unique (numero_permis);
