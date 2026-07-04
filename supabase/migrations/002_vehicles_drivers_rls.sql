-- ============================================================
-- Migration 002 : RLS pour le module pilote "Véhicules"
-- Tables concernées : vehicles, drivers
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Active RLS sur les deux tables (si pas déjà fait)
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;

-- Lecture : tout utilisateur connecté (peu importe son rôle) peut consulter
drop policy if exists "vehicles_select_authenticated" on public.vehicles;
create policy "vehicles_select_authenticated"
  on public.vehicles for select
  to authenticated
  using (true);

drop policy if exists "drivers_select_authenticated" on public.drivers;
create policy "drivers_select_authenticated"
  on public.drivers for select
  to authenticated
  using (true);

-- Écriture (create/update) : réservée aux rôles de gestion
-- (admin, responsable_exploitation, responsable_operations)
drop policy if exists "vehicles_write_managers" on public.vehicles;
create policy "vehicles_write_managers"
  on public.vehicles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'responsable_exploitation', 'responsable_operations')
    )
  );

drop policy if exists "vehicles_update_managers" on public.vehicles;
create policy "vehicles_update_managers"
  on public.vehicles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'responsable_exploitation', 'responsable_operations')
    )
  );

-- Suppression : réservée aux admins uniquement
drop policy if exists "vehicles_delete_admin" on public.vehicles;
create policy "vehicles_delete_admin"
  on public.vehicles for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- Notes :
-- - Ces policies supposent que la migration 001 (table `profiles`
--   + fonction is_admin()) a déjà été exécutée.
-- - Les tables `drivers` ne sont ici accessibles qu'en lecture ;
--   la gestion des chauffeurs (create/update/delete) sera couverte
--   dans le prochain module basculé (page Chauffeurs).
-- ============================================================
