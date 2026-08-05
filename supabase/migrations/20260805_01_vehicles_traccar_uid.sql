-- ============================================================================
-- Lien véhicule <-> device Traccar (suivi GPS). traccar_uid correspond au
-- champ "uniqueId" de l'API Traccar (ex: "sf-001"), pas au deviceId
-- numérique interne qui peut changer si l'appareil est recréé côté Traccar.
-- Nullable : tous les véhicules n'ont pas forcément de traceur GPS.
-- ============================================================================

alter table public.vehicles add column traccar_uid text;
