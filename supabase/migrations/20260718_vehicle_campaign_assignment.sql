-- ============================================================================
-- L'affectation d'un camion à une campagne était jusqu'ici enregistrée comme
-- une ligne "rotations" factice (statut en_cours, sans poids/BL) — ce qui la
-- faisait compter comme une vraie rotation dans les stats/écarts, alors
-- qu'une rotation ne commence réellement qu'à la saisie de la fiche du jour.
--
-- Remplacé par un simple champ vehicles.campaign_id (un camion ne peut être
-- affecté qu'à une seule campagne à la fois, ce qui correspond à la réalité).
-- ============================================================================

alter table public.vehicles add column if not exists campaign_id text references public.campaigns(id) on delete set null;

-- Reprend l'affectation actuelle de chaque camion depuis la ligne rotations
-- factice la plus récente (avant de les supprimer), pour ne pas perdre les
-- affectations en cours au moment de la migration.
update public.vehicles v
set campaign_id = r.campaign_id
from (
  select distinct on (rt.vehicle_id) rt.vehicle_id, rt.campaign_id
  from public.rotations rt
  where rt.poids_charge_tonnes is null
    and exists (select 1 from public.campaigns c where c.id = rt.campaign_id)
  order by rt.vehicle_id, rt.date_rotation desc
) r
where v.id = r.vehicle_id;

-- Nettoyage des lignes rotations factices (affectations passées,
-- reconnaissables : aucun poids enregistré — une vraie rotation en a toujours un).
delete from public.rotations where poids_charge_tonnes is null;
