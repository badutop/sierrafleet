// Edge Function: send-document-alerts
//
// Reconstruction de l'ancienne fonction serveur sendDocumentAlerts de
// l'ancien backend (supprimée). Parcourt les
// véhicules et chauffeurs, construit la liste des documents proches de
// l'expiration (vidange, assurance, visite technique, carte grise, permis),
// et envoie un récapitulatif WhatsApp via une instance Evolution API
// auto-hébergée (voir ../_shared/evolution.ts) si des alertes sont trouvées.
//
// Contrairement aux autres Edge Functions de ce projet, celle-ci n'est pas
// appelée par un utilisateur connecté : elle est destinée à être déclenchée
// automatiquement chaque matin par un job pg_cron (voir la migration SQL
// associée). Comme aucune session utilisateur n'est disponible dans ce
// contexte, elle est protégée par un secret partagé (header x-cron-secret,
// comparé à la variable d'environnement CRON_SECRET) plutôt que par un JWT
// utilisateur, et lit vehicles/drivers/app_settings avec la service_role
// key (contourne RLS — nécessaire ici car pas d'utilisateur authentifié
// pour porter les policies "authenticated").
//
// Déploiement (à lancer toi-même, rien n'est exécuté automatiquement) :
//   supabase functions deploy send-document-alerts
//   supabase secrets set CRON_SECRET=<valeur générée>
//
// Prérequis : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectées
// automatiquement par la plateforme. CRON_SECRET doit être configuré
// manuellement (secret partagé avec le job pg_cron qui appelle cette
// fonction), de même que EVOLUTION_API_URL / EVOLUTION_API_KEY /
// EVOLUTION_INSTANCE_NAME (voir ../_shared/evolution.ts).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppMessage } from '../_shared/evolution.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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

  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return jsonResponse({ error: 'Non autorisé' }, 401);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: settings, error: settingsError } = await adminClient
    .from('app_settings')
    .select('key, value');
  if (settingsError) {
    console.error(`[send-document-alerts] lecture app_settings échouée: ${settingsError.message}`);
    return jsonResponse({ error: settingsError.message }, 500);
  }
  const getSetting = (key: string) => settings?.find((s) => s.key === key)?.value || '';

  const waPhone = getSetting('wa_alert_phone');
  if (!waPhone) {
    return jsonResponse({ error: "Numéro WhatsApp non configuré dans les Paramètres (wa_alert_phone)" }, 400);
  }

  const [{ data: vehicles, error: vehiclesError }, { data: drivers, error: driversError }] = await Promise.all([
    adminClient.from('vehicles').select('*'),
    adminClient.from('drivers').select('*'),
  ]);
  if (vehiclesError || driversError) {
    console.error(`[send-document-alerts] lecture vehicles/drivers échouée: ${vehiclesError?.message || driversError?.message}`);
    return jsonResponse({ error: vehiclesError?.message || driversError?.message }, 500);
  }

  const now = new Date();
  const alerts: string[] = [];

  (vehicles || []).forEach((v) => {
    const label = v.immatriculation || v.code_camion || v.id;

    if (v.km_prochaine_vidange && v.km_actuel >= v.km_prochaine_vidange - 500) {
      const reste = v.km_prochaine_vidange - v.km_actuel;
      alerts.push(`🔧 Vidange ${label} : ${reste > 0 ? reste + ' km restants' : 'DÉPASSÉE'}`);
    }
    if (v.date_assurance) {
      const days = Math.floor((new Date(v.date_assurance).getTime() - now.getTime()) / 86400000);
      if (days <= 30) alerts.push(`🛡️ Assurance ${label} : ${days <= 0 ? 'EXPIRÉE' : 'expire dans ' + days + ' j'}`);
    }
    if (v.date_visite_technique) {
      const days = Math.floor((new Date(v.date_visite_technique).getTime() - now.getTime()) / 86400000);
      if (days <= 30) alerts.push(`🔍 Visite tech. ${label} : ${days <= 0 ? 'EXPIRÉE' : 'expire dans ' + days + ' j'}`);
    }
    if (v.date_carte_grise) {
      const days = Math.floor((new Date(v.date_carte_grise).getTime() - now.getTime()) / 86400000);
      if (days <= 30) alerts.push(`📄 Carte grise ${label} : ${days <= 0 ? 'EXPIRÉE' : 'expire dans ' + days + ' j'}`);
    }
  });

  (drivers || []).forEach((d) => {
    const label = `${d.prenom || ''} ${d.nom || ''}`.trim() || d.id;
    if (d.date_expiration_permis) {
      const days = Math.floor((new Date(d.date_expiration_permis).getTime() - now.getTime()) / 86400000);
      if (days <= 60) alerts.push(`🪪 Permis ${label} : ${days <= 0 ? 'EXPIRÉ' : 'expire dans ' + days + ' j'}`);
    }
  });

  if (alerts.length === 0) {
    return jsonResponse({ sent: false, message: 'Aucune alerte à envoyer' });
  }

  const today = now.toLocaleDateString('fr-FR');
  const message =
    `🚨 *Alertes Sierra Logistics — ${today}*\n\n` +
    alerts.join('\n') +
    `\n\n_Merci de traiter ces points rapidement._`;

  const result = await sendWhatsAppMessage(waPhone, message);
  if (!result.success) {
    console.error(`[send-document-alerts] échec: ${result.error}`);
    return jsonResponse({ sent: false, alerts_count: alerts.length, error: result.error }, 200);
  }

  console.log(`[send-document-alerts] ${alerts.length} alerte(s) envoyée(s) avec succès`);
  return jsonResponse({ sent: true, alerts_count: alerts.length });
});
