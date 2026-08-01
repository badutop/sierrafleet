-- ============================================================================
-- Empêche la suppression silencieuse d'un client/véhicule/chauffeur encore
-- référencé ailleurs (rotations, maintenances, carburant, carnet de bord,
-- campagnes, affectation véhicule<->chauffeur) — jusqu'ici ces colonnes
-- n'avaient AUCUNE contrainte de clé étrangère, donc une suppression
-- réussissait toujours, laissant des lignes orphelines invisibles.
--
-- IMPORTANT — données historiques déjà orphelines : un contrôle préalable a
-- trouvé un grand nombre de lignes déjà orphelines dans maintenance (749/757),
-- fuel_entries (1980/2005) et trip_logs (1561/1561, soit 100%) — quasi
-- certainement des données antérieures à la migration Base44->Supabase, dont
-- les vehicle_id/driver_id ne correspondent plus aux id actuels. Impossible
-- (et hors sujet) de réparer rétroactivement ce mapping perdu.
--
-- Ces contraintes sont donc ajoutées en NOT VALID quand des lignes
-- existantes les violeraient déjà : la contrainte s'applique immédiatement à
-- toute nouvelle écriture (empêche tout NOUVEL orphelin) et bloque bien la
-- suppression d'un véhicule/chauffeur/client tant qu'une ligne le référence
-- réellement, mais ne tente pas de valider (ni de corriger) l'historique
-- déjà orphelin. Les colonnes sans aucune ligne orpheline (vérifié avant
-- application) sont ajoutées normalement (validées).
-- ============================================================================

-- rotations.vehicle_id — 4 lignes déjà orphelines
alter table public.rotations
  add constraint rotations_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete restrict
  not valid;

-- rotations.driver_id — aucune ligne orpheline
alter table public.rotations
  add constraint rotations_driver_id_fkey
  foreign key (driver_id) references public.drivers(id) on delete restrict;

-- maintenance.vehicle_id — 749/757 lignes déjà orphelines (historique)
alter table public.maintenance
  add constraint maintenance_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete restrict
  not valid;

-- campaigns.client_id — aucune ligne orpheline
alter table public.campaigns
  add constraint campaigns_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete restrict;

-- fuel_entries.vehicle_id — 1980/2005 lignes déjà orphelines (historique)
alter table public.fuel_entries
  add constraint fuel_entries_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete restrict
  not valid;

-- trip_logs.vehicle_id / driver_id — 1561/1561 lignes déjà orphelines
-- (100% — quasi certainement 100% de données historiques pré-migration)
alter table public.trip_logs
  add constraint trip_logs_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete restrict
  not valid;
alter table public.trip_logs
  add constraint trip_logs_driver_id_fkey
  foreign key (driver_id) references public.drivers(id) on delete restrict
  not valid;

-- vehicles.driver_id (affectation chauffeur<->véhicule) — aucune ligne orpheline
alter table public.vehicles
  add constraint vehicles_driver_id_fkey
  foreign key (driver_id) references public.drivers(id) on delete restrict;
