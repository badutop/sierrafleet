-- ============================================================================
-- Stations d'essence de ravitaillement — paramétrables depuis Paramètres
-- (nom, emplacement + coordonnées GPS, téléphone du gérant). Même convention
-- que public.zones : table dédiée, RLS ouverte à tout utilisateur
-- authentifié (pas de restriction admin, contrairement à app_settings).
-- ============================================================================

create table if not exists public.fuel_stations (
  id text primary key,
  nom text not null,
  adresse text,
  latitude numeric,
  longitude numeric,
  telephone_gerant text,
  created_date timestamptz not null default now()
);

alter table public.fuel_stations enable row level security;

drop policy if exists "fuel_stations_all_authenticated" on public.fuel_stations;
create policy "fuel_stations_all_authenticated" on public.fuel_stations
  for all to authenticated using (true) with check (true);
