// Edge Function: admin-create-user
//
// Crée un compte utilisateur (auth.users + public.profiles) depuis
// l'interface d'administration. Remplace l'ancienne fonction serveur
// "inviteUser" de l'ancien backend (supprimée) — mais ici il n'y a
// pas d'email d'invitation : l'admin fixe directement l'email et le mot de
// passe, le compte est utilisable immédiatement.
//
// Déploiement (à lancer toi-même, rien n'est exécuté automatiquement) :
//   supabase functions deploy admin-create-user
//
// Prérequis : le projet doit être lié (`supabase link --project-ref <ref>`)
// et tu dois être connecté (`supabase login`). SUPABASE_URL,
// SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont injectées
// automatiquement par la plateforme Supabase Edge Functions, pas besoin de
// les configurer manuellement.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VALID_ROLES = [
  'admin',
  'responsable_exploitation',
  'responsable_operations',
  'collecteur_bons',
  'executeur_depenses',
  'chauffeur',
];

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Client "appelant" : sert uniquement à identifier qui fait la requête,
  // à partir du JWT transmis dans l'en-tête Authorization.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Authentification requise' }, 401);
  }

  // auth: { persistSession: false, ... } sur les deux clients ci-dessous :
  // sans ça, plusieurs instances de client Supabase dans le même contexte
  // Edge Function peuvent partager un état de session interne ("Multiple
  // GoTrueClient instances"), ce qui a fait fuiter la session de l'appelant
  // dans adminClient (auth.admin.createUser() renvoyait l'appelant lui-même
  // au lieu de créer un nouvel utilisateur).
  const noSessionAuthOptions = {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  };

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: noSessionAuthOptions,
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData?.user) {
    return jsonResponse({ error: 'Authentification invalide' }, 401);
  }

  // Client "admin" : utilise la service role key, contourne RLS. Ne doit
  // jamais être exposé ni renvoyé au client — reste côté serveur.
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
  let body: {
    email?: string;
    password?: string;
    role?: string;
    modules?: string[];
    driver_id?: string | null;
    full_name?: string;
  };

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Corps de requête JSON invalide' }, 400);
  }

  const { email, password, role, modules, driver_id, full_name } = body;

  if (!email || !password) {
    return jsonResponse({ error: 'email et password sont requis' }, 400);
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return jsonResponse({ error: `role invalide. Valeurs acceptées : ${VALID_ROLES.join(', ')}` }, 400);
  }
  if (password.length < 8) {
    return jsonResponse({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, 400);
  }

  // --- Vérification préalable : email déjà utilisé ? ---
  // Fait AVANT createUser plutôt que de compter sur son comportement d'erreur :
  // observé en pratique, un email en doublon peut renvoyer l'utilisateur
  // existant sans erreur, ce qui ferait ensuite déclencher à tort le
  // rollback ci-dessous et supprimer un compte légitime.
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    return jsonResponse({ error: 'Un compte existe déjà avec cet email' }, 409);
  }

  // --- Création du compte auth ---
  console.log(`[admin-create-user] appelant=${callerData.user.id} demande création pour email=${email}`);

  const beforeCreate = Date.now();
  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pas de vérification par email : le compte est utilisable immédiatement
    user_metadata: full_name ? { full_name } : undefined,
  });

  if (createUserError || !createdUser?.user) {
    console.log(`[admin-create-user] createUser a échoué: ${createUserError?.message}`);
    return jsonResponse({ error: createUserError?.message || 'Échec de la création du compte' }, 400);
  }

  console.log(
    `[admin-create-user] createUser a renvoyé id=${createdUser.user.id} email=${createdUser.user.email} created_at=${createdUser.user.created_at}`
  );

  const newUserId = createdUser.user.id;

  // Filet de sécurité : si createUser a renvoyé un utilisateur qui existait
  // déjà avant cet appel (créé il y a plus de 30s), on n'a PAS affaire à un
  // compte tout neuf — on abandonne sans jamais le supprimer.
  const createdAt = createdUser.user.created_at ? new Date(createdUser.user.created_at).getTime() : 0;
  if (!createdAt || beforeCreate - createdAt > 30_000) {
    return jsonResponse(
      { error: 'createUser a renvoyé un compte préexistant au lieu d\'en créer un nouveau — aucune suppression effectuée, contacte un développeur.' },
      409
    );
  }

  // --- Création du profil applicatif ---
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: newUserId,
    email,
    full_name: full_name || null,
    role,
    modules: modules || [],
    driver_id: role === 'chauffeur' ? driver_id || null : null,
  });

  if (profileError) {
    // Pas de transaction possible entre auth.users et public.profiles :
    // rollback manuel pour ne pas laisser un compte auth orphelin sans profil.
    // Sûr ici : on vient de vérifier ci-dessus que ce compte a été créé à
    // l'instant par CET appel, donc pas de risque de supprimer un compte
    // préexistant légitime.
    await adminClient.auth.admin.deleteUser(newUserId);
    return jsonResponse(
      { error: `Échec de la création du profil, compte auth annulé : ${profileError.message}` },
      500
    );
  }

  return jsonResponse({
    success: true,
    user: { id: newUserId, email },
  });
});
