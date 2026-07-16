-- ============================================================================
-- Multi-clients par campagne : un bateau/campagne peut être partagé par
-- plusieurs clients, chacun avec sa propre part de tonnage (base pour une
-- facturation individuelle à venir). campaigns.client_id/tonnage_total_prevu
-- restent la vue "agrégée" (1er client ajouté / somme des tonnages par
-- client) pour ne pas casser les écrans existants (CampaignDetail,
-- CampaignReport, CampaignInvoice, listes) qui lisent encore ces colonnes.
-- ============================================================================

create table if not exists public.campaign_clients (
  id text primary key default gen_random_uuid(),
  campaign_id text not null references public.campaigns(id) on delete cascade,
  client_id text not null references public.clients(id) on delete restrict,
  tonnage_prevu numeric not null default 0,
  created_date timestamptz not null default now()
);

create index if not exists campaign_clients_campaign_id_idx on public.campaign_clients(campaign_id);
create index if not exists campaign_clients_client_id_idx on public.campaign_clients(client_id);

alter table public.campaign_clients enable row level security;

drop policy if exists "campaign_clients_select_authenticated" on public.campaign_clients;
create policy "campaign_clients_select_authenticated" on public.campaign_clients
  for select to authenticated using (true);

drop policy if exists "campaign_clients_insert_admin_or_respex" on public.campaign_clients;
create policy "campaign_clients_insert_admin_or_respex" on public.campaign_clients
  for insert to authenticated
  with check (public.has_role(array['admin', 'responsable_exploitation']));

drop policy if exists "campaign_clients_update_admin_or_respex" on public.campaign_clients;
create policy "campaign_clients_update_admin_or_respex" on public.campaign_clients
  for update to authenticated
  using (public.has_role(array['admin', 'responsable_exploitation']))
  with check (public.has_role(array['admin', 'responsable_exploitation']));

drop policy if exists "campaign_clients_delete_admin_or_respex" on public.campaign_clients;
create policy "campaign_clients_delete_admin_or_respex" on public.campaign_clients
  for delete to authenticated using (public.has_role(array['admin', 'responsable_exploitation']));

-- Nombre de camions disponibles pour la campagne — base du calcul auto de la
-- durée/date de fin prévue (camions × 2 rotations/jour) à partir du tonnage.
alter table public.campaigns add column if not exists nombre_camions integer;
