-- ============================================================================
-- Collecteur de bons — voir CollecteurBonsPage.jsx.
--
-- Une fois qu'un groupe de 3 rotations (même client + même camion) a atteint
-- la pompe (rotations.fuel_entry_id renseigné, via le rechargement auto du
-- chauffeur, voir refuelRules.getRefuelCheckpoints), le Collecteur de bons
-- doit pouvoir, pour chaque rotation du groupe, scanner le bon final délivré
-- par le client au dépôt/point de livraison — à comparer avec le bon déjà
-- scanné par le Responsable des Opérations (rotations.bon_physique_scan_url)
-- pour repérer un éventuel manquement/écart.
--
-- Ces colonnes ne remplacent ni ne modifient bon_physique_scan_url (bon
-- d'enlèvement, utilisé pour le suivi carburant) — elles tracent une étape
-- postérieure et distincte, à la livraison.
-- ============================================================================

alter table public.rotations add column if not exists bon_final_scan_url text;
alter table public.rotations add column if not exists bon_final_collecte_le timestamptz;
alter table public.rotations add column if not exists bon_final_collecte_par text;
alter table public.rotations add column if not exists ecart_bon_final boolean not null default false;
alter table public.rotations add column if not exists observation_bon_final text;
