// Edge Function: admin-delete-user
//
// Supprime complètement un compte utilisateur (public.profiles PUIS
// auth.users). Remplace la suppression partielle faite côté client dans
// UsersPage.jsx (qui ne pouvait supprimer que la ligne profiles — la clé
// service_role nécessaire à auth.admin.deleteUser() ne peut pas être exposée
// au navigateur).
//
// Déploiement (à lancer toi-même, rien n'est exécuté automatiquement) :
//   supabase functions deploy admin-delete-user

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Mêmes options sur les deux clients : évite le partage d'état de session
// interne entre plusieurs instances de client dans le même isolate Edge
// Function (cf. bug rencontré sur admin-create-user).
const noSessionAuthOptions = {
  autoRefreshToken: false,
  persistSession: false,
  detectSessionInUrl: false,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Authentification requise' }, 401);
  }

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: noSessionAuthOptions,
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData?.user) {
    return jsonResponse({ error: 'Authentification invalide' }, 401);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: noSessionAuthOptions,
  });

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single();

  if (callerProfileError || callerProfile?.role !== 'admin') {
    return jsonResponse({ error: 'Accès refusé — admin requis' }, 403);
  }

  // --- Validation du payload ---
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Corps de requête JSON invalide' }, 400);
  }

  const { id } = body;
  if (!id) {
    return jsonResponse({ error: 'id requis' }, 400);
  }

  if (id === callerData.user.id) {
    return jsonResponse({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, 400);
  }

  // --- On garde une copie du profil avant suppression, pour pouvoir le
  //     restaurer si la suppression auth.users échoue ensuite (rollback). ---
  const { data: existingProfile, error: fetchError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingProfile) {
    return jsonResponse({ error: 'Utilisateur introuvable' }, 404);
  }

  // --- 1) Suppression de la ligne profiles ---
  const { error: deleteProfileError } = await adminClient.from('profiles').delete().eq('id', id);
  if (deleteProfileError) {
    return jsonResponse({ error: `Échec de la suppression du profil : ${deleteProfileError.message}` }, 500);
  }

  // --- 2) Suppression du compte auth ---
  // Note : profiles.id référence auth.users(id) ON DELETE CASCADE, donc
  // supprimer directement auth.users aurait aussi supprimé profiles
  // automatiquement — mais on fait les deux étapes explicitement comme
  // demandé, notamment pour pouvoir distinguer et gérer chaque échec.
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(id);

  if (deleteAuthError) {
    // Rollback : on restaure le profil supprimé à l'étape 1 pour ne pas
    // laisser le système dans un état incohérent (compte auth vivant sans
    // profil applicatif).
    await adminClient.from('profiles').insert(existingProfile);
    return jsonResponse(
      { error: `Échec de la suppression du compte auth, profil restauré : ${deleteAuthError.message}` },
      500
    );
  }

  return jsonResponse({ success: true, deletedUserId: id });
});
