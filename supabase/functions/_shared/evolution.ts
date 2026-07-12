// Client minimal pour l'API Evolution (WhatsApp auto-hébergé), partagé
// entre whatsapp-notify et send-document-alerts. Remplace callmebot.com.
//
// Variables d'environnement requises (à définir via `supabase secrets set`,
// jamais en dur dans le code) :
//   EVOLUTION_API_URL       ex: https://xxxx.ngrok-free.app (test) ou
//                            l'URL du serveur hébergé en prod
//   EVOLUTION_API_KEY       la clé API de l'instance (AUTHENTICATION_API_KEY
//                            au démarrage du conteneur, ou clé d'instance)
//   EVOLUTION_INSTANCE_NAME le nom de l'instance créée (ex: sierrafleet-test)

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME');

export async function sendWhatsAppMessage(
  number: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
    return {
      success: false,
      error: 'Evolution API non configurée (EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE_NAME manquant)',
    };
  }

  const url = `${EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number, text }),
    });
    const responseText = await res.text();

    // Contrairement à callmebot.com, Evolution API renvoie de vrais codes
    // HTTP d'erreur (400/401/...) — !res.ok suffit ici à détecter un échec.
    if (!res.ok) {
      return { success: false, error: `Evolution API ${res.status}: ${responseText}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
