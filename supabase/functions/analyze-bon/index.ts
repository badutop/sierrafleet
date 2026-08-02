// Edge Function: analyze-bon
//
// Lit la photo d'un "bon d'enlèvement" scanné par le chauffeur (voir
// DriverBonEntryFlow.jsx) via l'API vision d'Anthropic (Claude), pour
// pré-remplir automatiquement poids et N° de BL dans la fiche du jour —
// partie du nouveau flux "saisie par le chauffeur" (togglable, voir
// src/components/settings/DriverBonEntryToggleCard.jsx et
// src/lib/driverBonEntry.js). N'échoue jamais bruyamment : si le document
// n'est pas lisible ou que l'appel IA échoue, renvoie des champs null que
// le chauffeur complète lui-même à l'écran de confirmation — l'extraction
// n'est qu'une aide à la saisie, jamais un blocage.
//
// Déploiement (à lancer toi-même, rien n'est exécuté automatiquement) :
//   supabase functions deploy analyze-bon
//
// Prérequis : ANTHROPIC_API_KEY doit être configurée manuellement
// (`supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`) — clé d'un compte
// Anthropic avec facturation activée. SUPABASE_URL / SUPABASE_ANON_KEY sont
// injectées automatiquement par la plateforme.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_MODEL = 'claude-sonnet-5';

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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const EXTRACTION_PROMPT = `Tu analyses la photo d'un "bon d'enlèvement" (bon de livraison / BL) utilisé pour le transport de marchandises en vrac au Sénégal. Extrais uniquement ces deux informations si elles sont clairement lisibles sur le document :
- poids_tonnes : le poids/tonnage chargé, en tonnes (nombre décimal, ex: 37.12). null si illisible ou absent.
- numero_bon_client : le numéro du bon ou du BL tel qu'écrit sur le document (chaîne de caractères, garde les zéros de tête). null si illisible ou absent.

Réponds UNIQUEMENT avec un objet JSON strictement de cette forme, sans aucun texte avant ou après, sans balises markdown :
{"poids_tonnes": <number|null>, "numero_bon_client": <string|null>}`;

function extractJson(text: string): { poids_tonnes: number | null; numero_bon_client: string | null } {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      poids_tonnes: typeof parsed.poids_tonnes === 'number' ? parsed.poids_tonnes : null,
      numero_bon_client: typeof parsed.numero_bon_client === 'string' ? parsed.numero_bon_client : null,
    };
  } catch {
    return { poids_tonnes: null, numero_bon_client: null };
  }
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

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData?.user) {
    return jsonResponse({ error: 'Authentification invalide' }, 401);
  }

  let body: { image_url?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Corps de requête JSON invalide' }, 400);
  }
  if (!body.image_url) {
    return jsonResponse({ error: 'image_url est requis' }, 400);
  }

  // Extraction best-effort : toute erreur ici renvoie des champs null
  // plutôt qu'une erreur HTTP — le chauffeur reste toujours capable de
  // saisir manuellement à l'écran de confirmation.
  if (!ANTHROPIC_API_KEY) {
    console.error('[analyze-bon] ANTHROPIC_API_KEY absente — extraction ignorée');
    return jsonResponse({ poids_tonnes: null, numero_bon_client: null, warning: 'IA non configurée' });
  }

  try {
    const imgResp = await fetch(body.image_url);
    if (!imgResp.ok) {
      console.error(`[analyze-bon] téléchargement image échoué: ${imgResp.status}`);
      return jsonResponse({ poids_tonnes: null, numero_bon_client: null });
    }
    const mediaType = imgResp.headers.get('content-type') || 'image/jpeg';
    const base64 = arrayBufferToBase64(await imgResp.arrayBuffer());

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        }],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error(`[analyze-bon] appel Anthropic échoué (${aiResp.status}): ${errText}`);
      return jsonResponse({ poids_tonnes: null, numero_bon_client: null });
    }

    const aiData = await aiResp.json();
    const text = aiData?.content?.[0]?.text || '';
    const extracted = extractJson(text);
    console.log(`[analyze-bon] appelant=${callerData.user.id} extrait=${JSON.stringify(extracted)}`);
    return jsonResponse(extracted);
  } catch (err) {
    console.error(`[analyze-bon] erreur inattendue: ${err instanceof Error ? err.message : String(err)}`);
    return jsonResponse({ poids_tonnes: null, numero_bon_client: null });
  }
});
