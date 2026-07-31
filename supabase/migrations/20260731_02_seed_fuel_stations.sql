-- ============================================================================
-- Reprend dans public.fuel_stations les 6 stations qui étaient jusqu'ici
-- codées en dur dans le sélecteur de FuelSupplyDialog.jsx (retiré au profit
-- de cette table paramétrable dans Paramètres > Les Stations d'essence) —
-- sans quoi le menu déroulant se retrouvait vide après ce changement.
-- Idempotent : ne réinsère pas un nom déjà présent.
-- ============================================================================

insert into public.fuel_stations (id, nom)
select gen_random_uuid()::text, seed.nom
from (values
  ('Star Oil - Pompier'),
  ('Star Oil - SIPS'),
  ('Star Oil - Sangalkam'),
  ('Elton'),
  ('TOTAL'),
  ('SHELL')
) as seed(nom)
where not exists (
  select 1 from public.fuel_stations fs where fs.nom = seed.nom
);
