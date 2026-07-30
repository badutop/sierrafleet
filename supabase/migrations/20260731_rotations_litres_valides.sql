-- ============================================================================
-- Litrage ajusté/validé par le Responsable de l'Exploitation dans
-- Carburant > Validation, avant de valider le rechargement d'un checkpoint
-- (3 rotations même client+camion). Stocké sur la rotation "checkpoint"
-- (3ᵉ rotation du groupe) uniquement — nul tant que non ajusté, auquel cas
-- le litrage théorique (zone × 3) reste utilisé par défaut.
-- ============================================================================

alter table public.rotations add column if not exists litres_valides numeric;
