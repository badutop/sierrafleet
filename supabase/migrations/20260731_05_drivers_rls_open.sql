-- ============================================================================
-- Bug trouvé en creusant "les scans de documents chauffeur ne sont pas
-- gardés" : la table drivers restreignait insert/update/delete à l'admin
-- seul (drivers_insert_admin / drivers_update_admin / drivers_delete_admin),
-- alors que l'UI (Drivers.jsx, DriverDocuments.jsx) ne fait aucune
-- restriction de rôle côté écriture — n'importe quel utilisateur avec le
-- module "drivers" peut scanner/uploader un document depuis l'écran. Pour un
-- non-admin, l'update RLS-filtré ne matchait alors aucune ligne : Postgres
-- ne renvoie PAS d'erreur pour un update à 0 ligne, donc le toast "Document
-- enregistré" s'affichait quand même, sans que rien ne soit réellement
-- enregistré — d'où l'impression que "ça ne garde pas" au retour sur la page.
--
-- Alignement sur le reste du schéma (vehicles, rotations, etc.) : le
-- contrôle d'accès par rôle se fait côté application (React), pas via RLS
-- par ligne — voir vehicles_all_authenticated pour le même modèle.
-- ============================================================================

drop policy if exists "drivers_insert_admin" on public.drivers;
drop policy if exists "drivers_update_admin" on public.drivers;
drop policy if exists "drivers_delete_admin" on public.drivers;
drop policy if exists "drivers_all_authenticated" on public.drivers;

create policy "drivers_all_authenticated" on public.drivers
  for all to authenticated using (true) with check (true);
