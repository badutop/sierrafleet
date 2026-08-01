-- ============================================================================
-- Seul l'admin peut corriger les champs de SAISIE d'une rotation (fiche du
-- jour) une fois créée — ex: une erreur de tonnage ou de N° de BL saisie par
-- le Responsable des Opérations. Voir CampaignRotationsTable.jsx.
--
-- Ne touche PAS aux champs de workflow, mis à jour par d'autres rôles après
-- la saisie initiale (et qui doivent continuer à fonctionner normalement) :
--   - bon_physique_recu, refuel_effectue, litres_valides : Responsable
--     Exploitation / Admin, Carburant > Validation (FuelValidationTab.jsx).
--   - fuel_entry_id : chauffeur, rechargement auto (PumpPhotoStep.jsx).
--   - bon_final_scan_url / bon_final_collecte_le / bon_final_collecte_par /
--     ecart_bon_final / observation_bon_final : Collecteur de bons
--     (CollecteurBonsPage.jsx).
--
-- Une policy RLS ne peut pas comparer OLD vs NEW sur un UPDATE (le WITH CHECK
-- ne voit que la ligne résultante) — d'où un trigger, qui a en plus
-- l'avantage de renvoyer une vraie erreur (contrairement à un UPDATE filtré
-- par RLS qui échoue silencieusement sans toucher aucune ligne, voir le bug
-- rencontré sur drivers).
-- ============================================================================

create or replace function public.protect_rotation_entry_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if (
      new.vehicle_id is distinct from old.vehicle_id or
      new.client_id is distinct from old.client_id or
      new.driver_id is distinct from old.driver_id or
      new.numero_rotation is distinct from old.numero_rotation or
      new.numero_bon_client is distinct from old.numero_bon_client or
      new.date_rotation is distinct from old.date_rotation or
      new.poids_charge_tonnes is distinct from old.poids_charge_tonnes or
      new.litres_carburant_alloues is distinct from old.litres_carburant_alloues or
      new.bon_physique_scan_url is distinct from old.bon_physique_scan_url
    ) then
      raise exception 'Seul un administrateur peut modifier la saisie d''une rotation (camion, poids, BL, date, bon d''enlèvement...)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_rotation_entry_fields_trigger on public.rotations;
create trigger protect_rotation_entry_fields_trigger
  before update on public.rotations
  for each row
  execute function public.protect_rotation_entry_fields();
