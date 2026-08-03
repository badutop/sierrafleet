-- ============================================================================
-- Collecteur de bons — extraction IA du bon de déchargement (voir
-- CollecteurBonsPage.jsx, nouveau flux togglable chauffeur_saisie_bon_actif).
--
-- Jusqu'ici, seule la photo du bon final était enregistrée
-- (bon_final_scan_url, voir 20260731_04_bon_final_collecte.sql) — le
-- Collecteur comparait lui-même à l'œil le poids/N° du bon final avec le bon
-- d'enlèvement pour cocher manuellement "Écart constaté". Désormais, la même
-- IA de lecture que pour le bon d'enlèvement (analyze-bon) lit aussi la photo
-- du bon final : ces deux colonnes stockent ce qu'elle en extrait, pour que
-- l'écart (ecart_bon_final) puisse être calculé automatiquement par le
-- système en comparant avec poids_charge_tonnes / numero_bon_client déjà
-- saisis à l'enlèvement — plus besoin que le Collecteur fasse cette
-- comparaison lui-même.
-- ============================================================================

alter table public.rotations add column if not exists poids_bon_final numeric;
alter table public.rotations add column if not exists numero_bon_final text;
