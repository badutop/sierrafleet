// Edge Function: log-audit
//
// Reconstruction de l'ancienne fonction serveur logAudit de l'ancien
// backend (supprimée). Insère une entrée dans public.audit_logs
// pour tracer une création/modification/suppression d'une entité métier.
//
// La policy RLS audit_logs_insert_authenticated permet déjà à n'importe
// quel utilisateur authentifié d'insérer directement dans audit_logs sans
// passer par une Edge Function. Celle-ci existe pour deux raisons :
// 1. Dériver user_email depuis le JWT de l'appelant (auth.getUser()) plutôt
//    que de faire confiance à une valeur fournie par le client — un client
//    buggé ou malveillant ne peut pas usurper l'identité dans le journal.
// 2. Centraliser le format du résumé (labels d'action, troncature JSON à
//    5000 caractères) pour que tous les appelants produisent des entrées
//    cohérentes.
//
// IMPORTANT : rien dans l'app n'appelle encore cette fonction depuis les
// mutations (create/update/delete) des entités métier — câbler chaque point
// de mutation est un chantier séparé, à faire au cas par cas. Cette
// fonction est prête à être invoquée dès que ce câblage sera fait.
//
// Déploiement (à lancer toi-même, rien n'est exécuté automatiquement) :
//   supabase functions deploy log-audit

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

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
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

  // auth: { persistSession: false, ... } — voir le même commentaire dans
  // admin-create-user/index.ts.
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

  let body: {
    event?: { entity_name?: string; entity_id?: string; type?: string };
    data?: unknown;
    old_data?: unknown;
    changed_fields?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Corps de requête JSON invalide' }, 400);
  }

  const { event, data, old_data, changed_fields } = body;
  const entityName = event?.entity_name || 'Inconnu';
  const action = event?.type || 'update';
  const summary = `${ACTION_LABELS[action] || action} sur ${entityName}`;

  const record = {
    id: crypto.randomUUID(),
    entity_name: entityName,
    entity_id: event?.entity_id || '',
    action,
    changed_fields: Array.isArray(changed_fields) ? changed_fields : [],
    user_email: callerData.user.email || 'système',
    summary,
    old_data: old_data ? JSON.stringify(old_data).slice(0, 5000) : '',
    new_data: data ? JSON.stringify(data).slice(0, 5000) : '',
  };

  const { error: insertError } = await callerClient.from('audit_logs').insert(record);
  if (insertError) {
    console.error(`[log-audit] appelant=${callerData.user.id} insertion échouée: ${insertError.message}`);
    return jsonResponse({ error: insertError.message }, 500);
  }

  return jsonResponse({ success: true });
});
