-- ============================================================================
-- "Redéployer camions" (ex-"Affecter camions", voir TruckAssignmentBoard.jsx)
-- permet de déplacer un camion directement d'une campagne en_cours vers une
-- autre campagne en_cours. Ce déplacement doit rester visible dans la
-- campagne de réception (pour le calcul de performance du camion, entre
-- autres) — d'où ces deux colonnes, renseignées uniquement lors d'un
-- déplacement direct entre deux campagnes en_cours (pas lors d'une simple
-- affectation depuis le pool de camions disponibles, ni lors d'un retrait).
--
-- Les rotations déjà effectuées restent, elles, liées à leur campagne
-- d'origine via rotations.campaign_id — inchangé, ce n'est pas ce que ces
-- colonnes tracent (elles ne concernent que l'affectation vehicles.campaign_id
-- elle-même, pas l'historique des rotations).
-- ============================================================================

alter table public.vehicles add column if not exists redeploye_depuis_campaign_id text references public.campaigns(id) on delete set null;
alter table public.vehicles add column if not exists date_redeploiement timestamptz;
