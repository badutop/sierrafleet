-- ============================================================================
-- Bootstrap manuel du tout premier admin.
--
-- À exécuter UNE SEULE FOIS, manuellement, dans le SQL Editor Supabase.
-- Nécessaire car admin-create-user exige déjà un admin existant pour
-- fonctionner (poule et l'oeuf) — ce script contourne ça pour le tout
-- premier compte uniquement. Ensuite, tous les comptes suivants doivent
-- passer par admin-create-user, pas par ce script.
--
-- Remplace 'TON_EMAIL_ICI' par l'email exact de ton compte Supabase Auth
-- existant avant d'exécuter.
-- ============================================================================

insert into public.profiles (id, email, full_name, role, modules)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  'admin',
  '{}'
from auth.users
where email = 'TON_EMAIL_ICI'
on conflict (id) do update set role = 'admin';

-- Vérification :
-- select id, email, role from public.profiles where email = 'TON_EMAIL_ICI';
