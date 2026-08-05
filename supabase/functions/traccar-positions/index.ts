// Edge Function: traccar-positions
//
// Relaie côté serveur les positions GPS de la flotte depuis un serveur
// Traccar (voir GpsTrackingPage.jsx). Les identifiants Traccar ne doivent
// jamais transiter côté client : ils sont lus ici depuis les secrets et
// utilisés pour un appel serveur-à-serveur.
//
// N'importe quel utilisateur authentifié peut appeler cette fonction (pas
// de vérification de rôle) — même principe que whatsapp-notify.
//
// Déploiement (à lancer toi-même, rien n'est exécuté automatiquement) :
//   supabase functions deploy traccar-positions
//
// Prérequis : le projet doit être lié (`supabase link --project-ref <ref>`)
// et tu dois être connecté (`supabase login`). SUPABASE_URL et
// SUPABASE_ANON_KEY sont injectées automatiquement par la plateforme.
// TRACCAR_URL / TRACCAR_USERNAME / TRACCAR_PASSWORD doivent être
// configurées manuellement :
//   supabase secrets set TRACCAR_URL=https://... TRACCAR_USERNAME=... TRACCAR_PASSWORD=...
// (TRACCAR_URL sans slash final, ex: "https://demo.traccar.org")

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Authentification requise' }, 401);
  }

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

  const traccarUrl = Deno.env.get('TRACCAR_URL');
  const traccarUsername = Deno.env.get('TRACCAR_USERNAME');
  const traccarPassword = Deno.env.get('TRACCAR_PASSWORD');
  if (!traccarUrl || !traccarUsername || !traccarPassword) {
    console.error('[traccar-positions] secrets TRACCAR_URL/TRACCAR_USERNAME/TRACCAR_PASSWORD manquants');
    return jsonResponse({ error: 'Suivi GPS non configuré' }, 200);
  }

  const authValue = 'Basic ' + btoa(`${traccarUsername}:${traccarPassword}`);
  const traccarHeaders = { Authorization: authValue };

  // Statut 200 même en cas d'échec Traccar (comme pour les secrets manquants
  // ci-dessus) : supabase-js remplace le corps JSON par un message générique
  // ("Edge Function returned a non-2xx status code") dès que le statut HTTP
  // n'est pas 2xx, ce qui masquerait le vrai message d'erreur côté client.
  let devicesRes: Response, positionsRes: Response;
  try {
    [devicesRes, positionsRes] = await Promise.all([
      fetch(`${traccarUrl}/api/devices`, { headers: traccarHeaders }),
      fetch(`${traccarUrl}/api/positions`, { headers: traccarHeaders }),
    ]);
  } catch (err) {
    console.error(`[traccar-positions] appel Traccar échoué: ${err}`);
    return jsonResponse({ error: 'Serveur Traccar injoignable' }, 200);
  }

  if (!devicesRes.ok || !positionsRes.ok) {
    console.error(`[traccar-positions] Traccar a répondu devices=${devicesRes.status} positions=${positionsRes.status}`);
    return jsonResponse({ error: `Erreur serveur Traccar (devices=${devicesRes.status}, positions=${positionsRes.status})` }, 200);
  }

  const devices = await devicesRes.json();
  const positions = await positionsRes.json();
  const positionByDeviceId = new Map(positions.map((p: Record<string, unknown>) => [p.deviceId, p]));

  const merged = devices.map((d: Record<string, unknown>) => {
    const pos = positionByDeviceId.get(d.id) as Record<string, unknown> | undefined;
    return {
      uniqueId: d.uniqueId,
      name: d.name,
      status: d.status,
      lastUpdate: d.lastUpdate,
      latitude: pos?.latitude ?? null,
      longitude: pos?.longitude ?? null,
      speed: pos?.speed ?? null,
      course: pos?.course ?? null,
      address: pos?.address ?? null,
      fixTime: pos?.fixTime ?? null,
    };
  });

  return jsonResponse({ devices: merged });
});
