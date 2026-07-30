-- ============================================================================
-- Zones — jusqu'ici codées en dur (zone1..zone4) dans ClientsPage.jsx,
-- DepotsEditor.jsx, FuelCampaignTab.jsx et refuelRules.js. Passage en table
-- paramétrable (module Paramètres) : les 4 zones existantes sont reprises à
-- l'identique (numero + code + litrage) pour ne rien casser sur les
-- clients/dépôts déjà rattachés à "zone1".."zone4" ; seul le libellé reste à
-- affiner par l'utilisateur, désormais éditable sans déploiement.
-- ============================================================================

create table if not exists public.zones (
  id text primary key,
  numero integer not null unique,
  code text not null unique,
  libelle text not null,
  litrage_approximatif numeric not null default 0,
  created_date timestamptz not null default now()
);

alter table public.zones enable row level security;

drop policy if exists "zones_all_authenticated" on public.zones;
create policy "zones_all_authenticated" on public.zones
  for all to authenticated using (true) with check (true);

insert into public.zones (id, numero, code, libelle, litrage_approximatif) values
  ('zone1', 1, 'zone1', 'Zone 1', 9),
  ('zone2', 2, 'zone2', 'Zone 2', 25),
  ('zone3', 3, 'zone3', 'Zone 3', 30),
  ('zone4', 4, 'zone4', 'Zone 4', 40)
on conflict (code) do nothing;
