// Edge Function: whatsapp-notify
//
// Relaie côté serveur l'envoi WhatsApp de confirmation de rechargement
// carburant, via une instance Evolution API auto-hébergée (voir
// ../_shared/evolution.ts). Remplace les appels fetch() directs faits
// depuis le navigateur (PumpPhotoStep.jsx, RotationSheetEntry.jsx), qui
// échouaient systématiquement avec l'ancien fournisseur callmebot.com :
// CORS bloquait tout fetch() direct depuis une page web. Un appel
// serveur-à-serveur n'est pas soumis à cette restriction.
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
// SUPABASE_ANON_KEY sont injectées automatiquement par la plateforme.
// EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE_NAME doivent
// être configurées manuellement (`supabase secrets set ...`) — voir
// ../_shared/evolution.ts. Pas besoin de SUPABASE_SERVICE_ROLE_KEY ici :
// app_settings est lisible par tout utilisateur authentifié (policy
// app_settings_select_authenticated).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppMessage } from '../_shared/evolution.ts';

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

  // --- Numéro destinataire : transmis dans le payload (le client le
  // connaît déjà, il l'affiche), sinon relu depuis app_settings.
  // wa_alert_apikey n'existe plus : l'authentification Evolution API se
  // fait au niveau de l'instance (EVOLUTION_API_KEY), pas par destinataire.
  let phone = body.phone;
  if (!phone) {
    const { data: setting, error: settingsError } = await callerClient
      .from('app_settings')
      .select('value')
      .eq('key', 'wa_alert_phone')
      .maybeSingle();
    if (settingsError) {
      console.error(`[whatsapp-notify] lecture app_settings échouée: ${settingsError.message}`);
      return jsonResponse({ error: 'Paramètres WhatsApp indisponibles' }, 500);
    }
    phone = setting?.value;
  }

  if (!phone) {
    console.log(`[whatsapp-notify] appelant=${callerData.user.id} — numéro non configuré, notification ignorée`);
    return jsonResponse({ error: 'Notification WhatsApp non configurée (wa_alert_phone manquant)' }, 200);
  }

  const result = await sendWhatsAppMessage(phone, message);
  if (!result.success) {
    console.error(`[whatsapp-notify] appelant=${callerData.user.id} échec: ${result.error}`);
    return jsonResponse({ success: false, error: result.error }, 200);
  }

  console.log(`[whatsapp-notify] appelant=${callerData.user.id} notification envoyée avec succès`);
  return jsonResponse({ success: true });
});
