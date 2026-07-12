-- ============================================================================
-- Création des 4 tables manquantes pour sortir complètement de Base44 :
--   profiles (remplace l'entité "User"), app_settings, audit_logs,
--   pending_user_configs
--
-- À exécuter manuellement dans le SQL Editor du dashboard Supabase.
-- Ce script ne touche à aucune table existante (vehicles, drivers, ...).
--
-- Convention suivie (identique aux tables existantes, voir
-- base44/functions/migrateToSupabase/entry.ts:SUPABASE_COLUMNS) :
--   - id en TEXT (pas UUID), sauf profiles.id qui DOIT être UUID car il
--     référence auth.users(id) — voir note en bas de fichier.
--   - created_date / updated_date / created_by (pas created_at/updated_at)
--   - pas de contrainte FK stricte sur les colonnes *_id, comme le reste
--     du schéma (les FK sont commentées/optionnelles dans le script de
--     préparation de MigrationPage.jsx) — à adapter si tu préfères les
--     imposer.
--   - Aucune policy RLS n'est créée ici : les tables seront donc ouvertes
--     via la clé anon tant que tu n'auras pas activé/écrit de policies.
--     Les blocs "rls" trouvés dans les .jsonc Base44 sont indiqués en
--     commentaire pour référence future — rien n'est appliqué.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) app_settings  (ex-entité AppSetting : clé/valeur globale, ex: wa_alert_phone)
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  id            text primary key default gen_random_uuid()::text,
  key           text not null unique,
  value         text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

comment on table public.app_settings is 'Paramètres globaux de l''application (clé/valeur), ex-entité Base44 AppSetting.';

-- ----------------------------------------------------------------------------
-- 2) audit_logs  (ex-entité AuditLog : journal des créations/modifs/suppressions)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id              text primary key default gen_random_uuid()::text,
  entity_name     text not null,
  entity_id       text,
  action          text not null default 'update' check (action in ('create', 'update', 'delete')),
  changed_fields  text[] default '{}',
  user_email      text,
  summary         text,
  old_data        text, -- JSON stringifié, tronqué à 5000 caractères côté appli (peut être invalide en fin de chaîne)
  new_data        text, -- idem
  created_date    timestamptz not null default now(),
  updated_date    timestamptz not null default now(),
  created_by      text
);

create index if not exists idx_audit_logs_entity on public.audit_logs (entity_name, entity_id);
create index if not exists idx_audit_logs_created_date on public.audit_logs (created_date desc);

comment on table public.audit_logs is 'Journal d''audit (create/update/delete), ex-entité Base44 AuditLog.';

-- Rappel des règles d'accès Base44 d'origine (NON appliquées ici) :
--   create : ouvert à tous les utilisateurs authentifiés
--   read / update / delete : réservé au rôle 'admin'
-- => à traduire en policies RLS Postgres quand tu seras prêt (cf. profiles.role).

-- ----------------------------------------------------------------------------
-- 3) pending_user_configs  (ex-entité PendingUserConfig : config en attente
--    d'un utilisateur invité, appliquée à sa première connexion)
-- ----------------------------------------------------------------------------
create table if not exists public.pending_user_configs (
  id            text primary key default gen_random_uuid()::text,
  email         text not null,
  role          text not null,
  modules       text[] default '{}',
  driver_id     text, -- pas de FK stricte, cf. convention ci-dessus (référence logique à drivers.id)
  applied       boolean not null default false,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

create index if not exists idx_pending_user_configs_email on public.pending_user_configs (lower(email));
create index if not exists idx_pending_user_configs_applied on public.pending_user_configs (applied) where applied = false;

comment on table public.pending_user_configs is 'Configuration (rôle/modules/chauffeur) en attente d''application au premier login, ex-entité Base44 PendingUserConfig.';

-- ----------------------------------------------------------------------------
-- 4) profiles  (remplace l'entité "User" Base44 — voir note de conception
--    ci-dessous sur le lien avec supabase.auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  full_name     text,
  role          text not null default 'collecteur_bons' check (
                  role in (
                    'admin',
                    'responsable_exploitation',
                    'responsable_operations',
                    'collecteur_bons',
                    'executeur_depenses',
                    'chauffeur'
                  )
                ),
  modules       text[] default '{}',
  driver_id     text, -- pas de FK stricte, référence logique à drivers.id (rôle chauffeur)
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now()
);

create index if not exists idx_profiles_driver_id on public.profiles (driver_id) where driver_id is not null;

comment on table public.profiles is 'Profil applicatif (rôle, modules, chauffeur lié) de chaque utilisateur Supabase Auth. id = auth.users.id. Remplace l''entité Base44 "User".';

-- Rappel : aucune policy RLS n'est créée par ce script (voir en-tête).
