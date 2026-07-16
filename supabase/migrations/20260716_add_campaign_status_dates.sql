-- ============================================================================
-- Historique des transitions de statut d'une campagne, pour le stepper visuel
-- (CampaignStatusStepper.jsx). Les 6 statuts sont fixes et jamais revisités
-- une fois passés (workflow linéaire) : une colonne timestamp par statut
-- suffit, pas besoin d'une table d'historique séparée.
-- "creee" réutilise campaigns.created_date (déjà l'horodatage de création).
-- ============================================================================

alter table public.campaigns add column if not exists date_validee_responsable timestamptz;
alter table public.campaigns add column if not exists date_validee_operationnel timestamptz;
alter table public.campaigns add column if not exists date_en_cours timestamptz;
alter table public.campaigns add column if not exists date_terminee timestamptz;
alter table public.campaigns add column if not exists date_cloturee timestamptz;
