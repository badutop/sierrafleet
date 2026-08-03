-- ============================================================================
-- Le véhicule devient obligatoire sur les frais (ExpensesPage.jsx) — y
-- compris pour le type "autre", qui masquait jusqu'ici l'affectation
-- véhicule. Sûr à appliquer : les frais orphelins/sans véhicule ont été
-- nettoyés au préalable (reliquats de la migration Base44).
-- ============================================================================

alter table public.expenses alter column vehicle_id set not null;
