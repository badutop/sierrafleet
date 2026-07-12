-- ============================================================================
-- Policies RLS Postgres — traduction des règles d'accès Base44
-- (blocs "rls" des fichiers base44/entities/*.jsonc)
--
-- À exécuter manuellement dans le SQL Editor Supabase, après avoir vérifié
-- que public.profiles existe déjà (cf. 20260711_create_missing_tables.sql).
--
-- Statut RLS actuel (déduit de ce que tu as observé) :
--   - Tables préexistantes (vehicles, drivers, ...) : la lecture est déjà
--     bloquée pour TOUT LE MONDE, y compris les utilisateurs authentifiés.
--     Ça correspond exactement au comportement "RLS activé + aucune policy"
--     (deny-by-default). Les `alter table ... enable row level security`
--     ci-dessous sont donc probablement déjà no-op pour ces tables, mais
--     je les inclus quand même : cette commande est idempotente (aucune
--     erreur si RLS est déjà actif), donc sans risque de les relancer.
--   - Les 4 tables créées à l'étape précédente (app_settings, audit_logs,
--     pending_user_configs, profiles) : RLS n'a PAS été activé à la
--     création. Il FAUT donc les `enable row level security` ci-dessous
--     pour elles, sinon elles restent grandes ouvertes.
--
-- Toutes les policies ci-dessous ciblent le rôle Postgres "authenticated"
-- (utilisateurs connectés via supabase.auth). Le rôle "anon" n'a aucune
-- policy nulle part : un visiteur non connecté n'a accès à rien, ce qui
-- correspond au comportement actuel de l'app (auth obligatoire).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0) Fonctions utilitaires (lisent public.profiles en SECURITY DEFINER pour
--    éviter toute récursion RLS quand une policy a besoin de connaître le
--    rôle de l'utilisateur courant).
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(roles)
  );
$$;


-- ============================================================================
-- PARTIE A — Tables avec un bloc "rls" explicite dans Base44
--            (traduction fidèle des règles trouvées)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- drivers  (Base44 Driver: create/update/delete=admin, read=ouvert)
-- ----------------------------------------------------------------------------
alter table public.drivers enable row level security;

drop policy if exists "drivers_select_authenticated" on public.drivers;
create policy "drivers_select_authenticated" on public.drivers
  for select to authenticated using (true);

drop policy if exists "drivers_insert_admin" on public.drivers;
create policy "drivers_insert_admin" on public.drivers
  for insert to authenticated with check (public.is_admin());

drop policy if exists "drivers_update_admin" on public.drivers;
create policy "drivers_update_admin" on public.drivers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "drivers_delete_admin" on public.drivers;
create policy "drivers_delete_admin" on public.drivers
  for delete to authenticated using (public.is_admin());


-- ----------------------------------------------------------------------------
-- fuel_entries  (Base44 FuelEntry: create/read=ouvert, update/delete=créateur ou admin)
-- ----------------------------------------------------------------------------
alter table public.fuel_entries enable row level security;

drop policy if exists "fuel_entries_select_authenticated" on public.fuel_entries;
create policy "fuel_entries_select_authenticated" on public.fuel_entries
  for select to authenticated using (true);

drop policy if exists "fuel_entries_insert_authenticated" on public.fuel_entries;
create policy "fuel_entries_insert_authenticated" on public.fuel_entries
  for insert to authenticated with check (true);

drop policy if exists "fuel_entries_update_owner_or_admin" on public.fuel_entries;
create policy "fuel_entries_update_owner_or_admin" on public.fuel_entries
  for update to authenticated
  using (created_by = auth.email() or public.is_admin())
  with check (created_by = auth.email() or public.is_admin());

drop policy if exists "fuel_entries_delete_owner_or_admin" on public.fuel_entries;
create policy "fuel_entries_delete_owner_or_admin" on public.fuel_entries
  for delete to authenticated
  using (created_by = auth.email() or public.is_admin());


-- ----------------------------------------------------------------------------
-- expenses  (Base44 Expense: create/read=ouvert, update/delete=créateur ou admin)
-- ----------------------------------------------------------------------------
alter table public.expenses enable row level security;

drop policy if exists "expenses_select_authenticated" on public.expenses;
create policy "expenses_select_authenticated" on public.expenses
  for select to authenticated using (true);

drop policy if exists "expenses_insert_authenticated" on public.expenses;
create policy "expenses_insert_authenticated" on public.expenses
  for insert to authenticated with check (true);

drop policy if exists "expenses_update_owner_or_admin" on public.expenses;
create policy "expenses_update_owner_or_admin" on public.expenses
  for update to authenticated
  using (created_by = auth.email() or public.is_admin())
  with check (created_by = auth.email() or public.is_admin());

drop policy if exists "expenses_delete_owner_or_admin" on public.expenses;
create policy "expenses_delete_owner_or_admin" on public.expenses
  for delete to authenticated
  using (created_by = auth.email() or public.is_admin());


-- ----------------------------------------------------------------------------
-- campaigns  (Base44 Campaign: create/update=admin ou responsable_exploitation,
--             read=ouvert, delete=admin)
-- ----------------------------------------------------------------------------
alter table public.campaigns enable row level security;

drop policy if exists "campaigns_select_authenticated" on public.campaigns;
create policy "campaigns_select_authenticated" on public.campaigns
  for select to authenticated using (true);

drop policy if exists "campaigns_insert_admin_or_respex" on public.campaigns;
create policy "campaigns_insert_admin_or_respex" on public.campaigns
  for insert to authenticated
  with check (public.has_role(array['admin', 'responsable_exploitation']));

drop policy if exists "campaigns_update_admin_or_respex" on public.campaigns;
create policy "campaigns_update_admin_or_respex" on public.campaigns
  for update to authenticated
  using (public.has_role(array['admin', 'responsable_exploitation']))
  with check (public.has_role(array['admin', 'responsable_exploitation']));

drop policy if exists "campaigns_delete_admin" on public.campaigns;
create policy "campaigns_delete_admin" on public.campaigns
  for delete to authenticated using (public.is_admin());


-- ----------------------------------------------------------------------------
-- daily_declarations  (Base44 DailyDeclaration: create/read=ouvert,
--                      update=admin ou responsable_operations, delete=admin)
-- ----------------------------------------------------------------------------
alter table public.daily_declarations enable row level security;

drop policy if exists "daily_declarations_select_authenticated" on public.daily_declarations;
create policy "daily_declarations_select_authenticated" on public.daily_declarations
  for select to authenticated using (true);

drop policy if exists "daily_declarations_insert_authenticated" on public.daily_declarations;
create policy "daily_declarations_insert_authenticated" on public.daily_declarations
  for insert to authenticated with check (true);

drop policy if exists "daily_declarations_update_admin_or_respops" on public.daily_declarations;
create policy "daily_declarations_update_admin_or_respops" on public.daily_declarations
  for update to authenticated
  using (public.has_role(array['admin', 'responsable_operations']))
  with check (public.has_role(array['admin', 'responsable_operations']));

drop policy if exists "daily_declarations_delete_admin" on public.daily_declarations;
create policy "daily_declarations_delete_admin" on public.daily_declarations
  for delete to authenticated using (public.is_admin());


-- ----------------------------------------------------------------------------
-- audit_logs  (Base44 AuditLog: create=ouvert, read/update/delete=admin)
-- ----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
create policy "audit_logs_insert_authenticated" on public.audit_logs
  for insert to authenticated with check (true);

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated using (public.is_admin());

drop policy if exists "audit_logs_update_admin" on public.audit_logs;
create policy "audit_logs_update_admin" on public.audit_logs
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "audit_logs_delete_admin" on public.audit_logs;
create policy "audit_logs_delete_admin" on public.audit_logs
  for delete to authenticated using (public.is_admin());


-- ============================================================================
-- PARTIE B — ⚠️ Entités SANS bloc "rls" dans Base44 (ambigu, signalé
--            explicitement comme demandé). Base44 sans bloc "rls" = accès
--            totalement ouvert à tout utilisateur authentifié, sans même
--            de restriction "créateur uniquement". Les policies ci-dessous
--            REPRODUISENT FIDÈLEMENT ce comportement (aucune régression
--            fonctionnelle), avec juste en dessous une suggestion de
--            durcissement en commentaire, à activer si tu le souhaites.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- vehicles
-- ----------------------------------------------------------------------------
alter table public.vehicles enable row level security;

drop policy if exists "vehicles_all_authenticated" on public.vehicles;
create policy "vehicles_all_authenticated" on public.vehicles
  for all to authenticated using (true) with check (true);

-- SUGGESTION (non appliquée) : restreindre l'écriture aux gestionnaires de flotte :
--   drop policy "vehicles_all_authenticated" on public.vehicles;
--   create policy "vehicles_select_authenticated" on public.vehicles
--     for select to authenticated using (true);
--   create policy "vehicles_write_admin_or_respex" on public.vehicles
--     for insert to authenticated with check (public.has_role(array['admin','responsable_exploitation']));
--   -- + policies update/delete similaires


-- ----------------------------------------------------------------------------
-- clients
-- ----------------------------------------------------------------------------
alter table public.clients enable row level security;

drop policy if exists "clients_all_authenticated" on public.clients;
create policy "clients_all_authenticated" on public.clients
  for all to authenticated using (true) with check (true);

-- SUGGESTION (non appliquée) : écriture réservée à admin/responsable_exploitation,
-- comme pour vehicles ci-dessus.


-- ----------------------------------------------------------------------------
-- depots
-- ----------------------------------------------------------------------------
alter table public.depots enable row level security;

drop policy if exists "depots_all_authenticated" on public.depots;
create policy "depots_all_authenticated" on public.depots
  for all to authenticated using (true) with check (true);

-- SUGGESTION (non appliquée) : écriture réservée à admin/responsable_exploitation.


-- ----------------------------------------------------------------------------
-- suppliers
-- ----------------------------------------------------------------------------
alter table public.suppliers enable row level security;

drop policy if exists "suppliers_all_authenticated" on public.suppliers;
create policy "suppliers_all_authenticated" on public.suppliers
  for all to authenticated using (true) with check (true);

-- SUGGESTION (non appliquée) : écriture réservée à admin/responsable_exploitation
-- (ou executeur_depenses, selon qui gère réellement les fournisseurs).


-- ----------------------------------------------------------------------------
-- maintenance
-- ----------------------------------------------------------------------------
alter table public.maintenance enable row level security;

drop policy if exists "maintenance_all_authenticated" on public.maintenance;
create policy "maintenance_all_authenticated" on public.maintenance
  for all to authenticated using (true) with check (true);

-- SUGGESTION (non appliquée) : delete réservé à admin, create/update ouverts.


-- ----------------------------------------------------------------------------
-- spare_parts
-- ----------------------------------------------------------------------------
alter table public.spare_parts enable row level security;

drop policy if exists "spare_parts_all_authenticated" on public.spare_parts;
create policy "spare_parts_all_authenticated" on public.spare_parts
  for all to authenticated using (true) with check (true);

-- SUGGESTION (non appliquée) : écriture réservée à admin/responsable_exploitation.


-- ----------------------------------------------------------------------------
-- rotations
-- ----------------------------------------------------------------------------
alter table public.rotations enable row level security;

drop policy if exists "rotations_all_authenticated" on public.rotations;
create policy "rotations_all_authenticated" on public.rotations
  for all to authenticated using (true) with check (true);

-- SUGGESTION (non appliquée) : même logique que fuel_entries/expenses
-- (update/delete réservés au créateur ou à un admin), si on veut un jour
-- empêcher un utilisateur de modifier les rotations d'un autre.


-- ----------------------------------------------------------------------------
-- trip_logs
-- ----------------------------------------------------------------------------
alter table public.trip_logs enable row level security;

drop policy if exists "trip_logs_all_authenticated" on public.trip_logs;
create policy "trip_logs_all_authenticated" on public.trip_logs
  for all to authenticated using (true) with check (true);

-- SUGGESTION (non appliquée) : idem rotations.


-- ============================================================================
-- PARTIE C — Nouvelles tables (profiles, app_settings, pending_user_configs)
--            Pas de bloc "rls" Base44 puisque ce sont des tables nouvelles /
--            liées à l'auth. Propositions motivées ci-dessous — PAS une
--            reproduction fidèle d'un comportement Base44 existant.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
--   ⚠️ Recommandation volontairement plus stricte que "ouvert à tous" :
--   role/modules/driver_id contrôlent les permissions applicatives. Si tout
--   utilisateur authentifié pouvait modifier n'importe quel profil (y compris
--   le sien), il pourrait s'auto-promouvoir admin. D'où : lecture de son
--   propre profil (+ admin voit tout), écriture réservée à l'admin.
--   La création de la ligne profile à l'inscription devra passer par un
--   trigger SECURITY DEFINER sur auth.users (Phase 3), qui contourne RLS
--   et n'a donc pas besoin d'une policy INSERT ouverte ici.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
  for insert to authenticated with check (public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (public.is_admin());


-- ----------------------------------------------------------------------------
-- app_settings
--   ⚠️ Autre écart volontaire par rapport à "ouvert à tous" : cette table
--   contient des secrets applicatifs (ex: clé API CallMeBot pour les alertes
--   WhatsApp, lue aujourd'hui côté client dans PumpPhotoStep.jsx). La lecture
--   reste ouverte à tout utilisateur authentifié (comportement actuel
--   nécessaire pour le flux de rechargement carburant), mais l'écriture est
--   restreinte à l'admin (SettingsPage.jsx est l'écran d'administration).
-- ----------------------------------------------------------------------------
alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated" on public.app_settings
  for select to authenticated using (true);

drop policy if exists "app_settings_insert_admin" on public.app_settings;
create policy "app_settings_insert_admin" on public.app_settings
  for insert to authenticated with check (public.is_admin());

drop policy if exists "app_settings_update_admin" on public.app_settings;
create policy "app_settings_update_admin" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "app_settings_delete_admin" on public.app_settings;
create policy "app_settings_delete_admin" on public.app_settings
  for delete to authenticated using (public.is_admin());


-- ----------------------------------------------------------------------------
-- pending_user_configs
--   ⚠️ IMPORTANT — voir message d'accompagnement : contrairement à ce que
--   fait AuthContext.jsx aujourd'hui (l'utilisateur invité met lui-même à
--   jour sa propre ligne via le SDK Base44), on N'AUTORISE PAS l'update
--   client-side ici, car ça ouvrirait une escalade de privilège (un
--   utilisateur pourrait changer son propre "role" avant de marquer la
--   ligne comme appliquée). Seule la lecture de SA PROPRE invitation (par
--   email) est permise, pour que l'app puisse détecter qu'une config
--   l'attend. L'écriture (insert/update/delete) est réservée à l'admin —
--   l'application réelle de la config devra se faire côté serveur
--   (Edge Function avec service role) en Phase 3.
-- ----------------------------------------------------------------------------
alter table public.pending_user_configs enable row level security;

drop policy if exists "pending_user_configs_select_own_or_admin" on public.pending_user_configs;
create policy "pending_user_configs_select_own_or_admin" on public.pending_user_configs
  for select to authenticated
  using (lower(email) = lower(auth.email()) or public.is_admin());

drop policy if exists "pending_user_configs_insert_admin" on public.pending_user_configs;
create policy "pending_user_configs_insert_admin" on public.pending_user_configs
  for insert to authenticated with check (public.is_admin());

drop policy if exists "pending_user_configs_update_admin" on public.pending_user_configs;
create policy "pending_user_configs_update_admin" on public.pending_user_configs
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pending_user_configs_delete_admin" on public.pending_user_configs;
create policy "pending_user_configs_delete_admin" on public.pending_user_configs
  for delete to authenticated using (public.is_admin());
