-- ============================================================================
-- Bug réel constaté : tonnage_realise / nombre_rotations_realisees restaient
-- figés à 0 sur des campagnes ayant pourtant des dizaines de rotations bien
-- enregistrées (ex: "Mamour Test" — 12 rotations, 470 T réelles, mais 0/0
-- affichés dans Campagnes).
--
-- Cause : campaigns_update_admin_or_respex limitait l'UPDATE de la table
-- campaigns aux rôles admin/responsable_exploitation. Or CE SONT
-- Responsable des Opérations (RotationSheetEntry.jsx, ancien flux) ET le
-- chauffeur (DriverBonEntryFlow.jsx, nouveau flux togglable) qui
-- incrémentent nombre_rotations_realisees/tonnage_realise à chaque nouvelle
-- rotation — ni l'un ni l'autre rôle n'était couvert par la policy. Une
-- policy RLS qui échoue ne renvoie pas d'erreur : l'UPDATE affecte
-- silencieusement 0 ligne (même piège déjà rencontré et documenté sur
-- drivers/rotations, voir 20260801_01_protect_rotation_entry_fields.sql) —
-- d'où des compteurs figés sans qu'aucune erreur ne remonte jamais côté app.
--
-- Correctif : même stratégie que pour rotations (RLS ouverte à tout
-- utilisateur authentifié + trigger qui protège spécifiquement les champs
-- de DÉFINITION/statut de la campagne, réservés à admin/responsable
-- exploitation). tonnage_realise et nombre_rotations_realisees restent les
-- deux seuls champs modifiables par n'importe quel rôle authentifié.
-- ============================================================================

drop policy if exists "campaigns_update_admin_or_respex" on public.campaigns;
create policy "campaigns_update_authenticated" on public.campaigns
  for update to authenticated using (true) with check (true);

create or replace function public.protect_campaign_definition_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(array['admin', 'responsable_exploitation']) then
    if (
      new.nom_campagne is distinct from old.nom_campagne or
      new.client_id is distinct from old.client_id or
      new.navire is distinct from old.navire or
      new.type_marchandise is distinct from old.type_marchandise or
      new.point_origine is distinct from old.point_origine or
      new.depot_destination_id is distinct from old.depot_destination_id or
      new.date_debut is distinct from old.date_debut or
      new.date_fin_prevue is distinct from old.date_fin_prevue or
      new.tonnage_total_prevu is distinct from old.tonnage_total_prevu or
      new.nombre_rotations_prevues is distinct from old.nombre_rotations_prevues or
      new.nombre_camions is distinct from old.nombre_camions or
      new.statut is distinct from old.statut or
      new.observations is distinct from old.observations or
      new.date_validee_responsable is distinct from old.date_validee_responsable or
      new.date_validee_operationnel is distinct from old.date_validee_operationnel or
      new.date_en_cours is distinct from old.date_en_cours or
      new.date_terminee is distinct from old.date_terminee or
      new.date_cloturee is distinct from old.date_cloturee
    ) then
      raise exception 'Seul un administrateur ou le Responsable Exploitation peut modifier la définition ou le statut d''une campagne';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_campaign_definition_fields_trigger on public.campaigns;
create trigger protect_campaign_definition_fields_trigger
  before update on public.campaigns
  for each row
  execute function public.protect_campaign_definition_fields();
