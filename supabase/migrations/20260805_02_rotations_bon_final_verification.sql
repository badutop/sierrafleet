-- ============================================================================
-- Distingue "pas encore contrôlé par le Collecteur de bons" de "contrôlé,
-- sans écart" — ecart_bon_final vaut false par défaut dans les deux cas,
-- insuffisant pour représenter ces 3 états (voir CollecteurBonsPage.jsx).
-- Même famille que bon_final_collecte_le/bon_final_collecte_par.
-- ============================================================================

alter table public.rotations
  add column bon_final_verifie_le timestamptz,
  add column bon_final_verifie_par text;
