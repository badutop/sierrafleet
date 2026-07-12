-- ============================================================================
-- Suppression du trigger "on_auth_user_created" / handle_new_user()
--
-- Ce trigger préexistait (probablement un reliquat d'un template Supabase
-- par défaut) et insérait automatiquement une ligne minimale dans
-- public.profiles (id, email, full_name — sans role/modules/driver_id) à
-- chaque création dans auth.users.
--
-- Conflit découvert : il s'exécute AVANT que admin-create-user ne fasse son
-- propre insert (avec le rôle/modules/driver_id fournis par l'admin), donc
-- le second insert échouait avec "duplicate key value violates unique
-- constraint profiles_pkey".
--
-- Conforme à la décision prise : pas d'auto-inscription, la Edge Function
-- admin-create-user contrôle entièrement la création du profil.
-- ============================================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
