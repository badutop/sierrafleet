-- ============================================================
-- Migration 001 : Profils utilisateurs & rôles (Supabase Auth)
-- À exécuter une seule fois dans Supabase SQL Editor
-- ============================================================

-- 1. Table des rôles applicatifs (équivalent de l'entité User de Base44)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'collecteur_bons'
    check (role in (
      'admin',
      'responsable_exploitation',
      'responsable_operations',
      'collecteur_bons',
      'executeur_depenses',
      'chauffeur'
    )),
  modules text[] not null default '{}',
  driver_id text, -- lien vers la table drivers si role = 'chauffeur'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil applicatif lié à chaque utilisateur Supabase Auth (rôle, modules autorisés, etc.)';

-- 2. Trigger : création automatique d'un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Trigger : mise à jour de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- 4. Row Level Security
alter table public.profiles enable row level security;

-- Chaque utilisateur peut lire son propre profil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Chaque utilisateur peut mettre à jour certains de ses champs (pas le rôle)
-- NB: la restriction "pas le rôle" doit être appliquée côté application/edge function,
-- Postgres RLS ne permet pas de restreindre colonne par colonne facilement en update.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Fonction utilitaire : l'utilisateur courant est-il admin ?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Les admins peuvent tout lire et tout modifier
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Notes :
-- - Le rôle par défaut à l'inscription est 'collecteur_bons'.
--   Un admin devra promouvoir manuellement (ou via UsersPage)
--   les nouveaux comptes vers le bon rôle.
-- - Le champ driver_id permettra de relier un compte "chauffeur"
--   à son enregistrement dans la table drivers (une fois migrée).
-- ============================================================
