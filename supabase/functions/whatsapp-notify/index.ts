// Edge Function: whatsapp-notify
//
// Relaie côté serveur l'appel à api.callmebot.com pour la notification
// WhatsApp de confirmation de rechargement carburant. Remplace les appels
// fetch() directs faits depuis le navigateur (PumpPhotoStep.jsx,
// RotationSheetEntry.jsx), qui échouaient systématiquement : callmebot.com
// ne renvoie pas d'en-tête Access-Control-Allow-Origin, donc un fetch()
// depuis une page web est bloqué par CORS quel que soit le contenu de la
// requête. Un appel serveur-à-serveur (Edge Function → callmebot.com) n'est
// pas soumis à cette restriction.
//
// N'importe quel utilisateur authentifié peut appeler cette fonction (pas
// de vérification de rôle) : un chauffeur doit pouvoir déclencher la
// notification liée à son propre rechargement.
//
// Déploiement (à lancer toi-même, rien n'est exécuté automatiquement) :
//   supabase functions deploy whatsapp-notify
//
// Prérequis : le projet doit être lié (`supabase link --project-ref <ref>`)
// et tu dois être connecté (`supabase login`). SUPABASE_URL et
// SUPABASE_ANON_KEY sont injectées automatiquement par la plateforme
// Supabase Edge Functions, pas besoin de les configurer manuellement.
// Pas besoin de SUPABASE_SERVICE_ROLE_KEY ici : app_settings est lisible
// par tout utilisateur authentifié (policy app_settings_select_authenticated).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Authentification requise' }, 401);
  }

  // auth: { persistSession: false, ... } — voir le commentaire équivalent
  // dans admin-create-user/index.ts : évite le partage d'état de session
  // entre instances de client Supabase dans le même contexte d'exécution.
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

  // --- Validation du payload ---
  let body: { phone?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Corps de requête JSON invalide' }, 400);
  }

  const { message } = body;
  if (!message) {
    return jsonResponse({ error: 'message est requis' }, 400);
  }

  // --- Paramètres WhatsApp : mêmes clés app_settings qu'aujourd'hui côté
  // client. Le numéro peut être transmis dans le payload (le client le
  // connaît déjà, il l'affiche) ; l'apikey n'est en revanche jamais acceptée
  // depuis le client, elle est relue ici pour ne plus jamais transiter par
  // le navigateur.
  const { data: settings, error: settingsError } = await callerClient
    .from('app_settings')
    .select('key, value')
    .in('key', ['wa_alert_phone', 'wa_alert_apikey']);

  if (settingsError) {
    console.error(`[whatsapp-notify] lecture app_settings échouée: ${settingsError.message}`);
    return jsonResponse({ error: 'Paramètres WhatsApp indisponibles' }, 500);
  }

  const phone = body.phone || settings?.find((s) => s.key === 'wa_alert_phone')?.value;
  const apikey = settings?.find((s) => s.key === 'wa_alert_apikey')?.value;

  if (!phone || !apikey) {
    console.log(`[whatsapp-notify] appelant=${callerData.user.id} — phone ou apikey non configuré, notification ignorée`);
    return jsonResponse({ error: 'Notification WhatsApp non configurée (phone/apikey manquant)' }, 200);
  }

  // --- Appel serveur-à-serveur à callmebot.com ---
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      console.error(`[whatsapp-notify] appelant=${callerData.user.id} callmebot a répondu ${res.status}: ${text}`);
      return jsonResponse({ success: false, error: `callmebot ${res.status}` }, 200);
    }
    console.log(`[whatsapp-notify] appelant=${callerData.user.id} notification envoyée avec succès`);
    return jsonResponse({ success: true });
  } catch (err) {
    console.error(`[whatsapp-notify] appelant=${callerData.user.id} appel callmebot en échec: ${err instanceof Error ? err.message : String(err)}`);
    return jsonResponse({ success: false, error: 'Échec de l\'appel callmebot' }, 200);
  }
});
