import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Lit les settings depuis l'entité AppSetting
    const settings = await base44.asServiceRole.entities.AppSetting.list();
    const getSetting = (key) => settings.find(s => s.key === key)?.value || "";

    const waPhone = getSetting("wa_alert_phone");
    const waApiKey = getSetting("wa_alert_apikey");

    if (!waPhone || !waApiKey) {
      return Response.json({ error: "Numéro WhatsApp ou clé API CallMeBot non configurés dans les Paramètres" }, { status: 400 });
    }

    const [vehicles, drivers] = await Promise.all([
      base44.asServiceRole.entities.Vehicle.list(),
      base44.asServiceRole.entities.Driver.list(),
    ]);

    const now = new Date();
    const alerts = [];

    // Alertes véhicules
    vehicles.forEach(v => {
      const label = v.immatriculation || v.code_camion || v.id;

      if (v.km_prochaine_vidange && v.km_actuel >= v.km_prochaine_vidange - 500) {
        const reste = v.km_prochaine_vidange - v.km_actuel;
        alerts.push(`🔧 Vidange ${label} : ${reste > 0 ? reste + " km restants" : "DÉPASSÉE"}`);
      }
      if (v.date_assurance) {
        const days = Math.floor((new Date(v.date_assurance) - now) / 86400000);
        if (days <= 30) alerts.push(`🛡️ Assurance ${label} : ${days <= 0 ? "EXPIRÉE" : "expire dans " + days + " j"}`);
      }
      if (v.date_visite_technique) {
        const days = Math.floor((new Date(v.date_visite_technique) - now) / 86400000);
        if (days <= 30) alerts.push(`🔍 Visite tech. ${label} : ${days <= 0 ? "EXPIRÉE" : "expire dans " + days + " j"}`);
      }
      if (v.date_carte_grise) {
        const days = Math.floor((new Date(v.date_carte_grise) - now) / 86400000);
        if (days <= 30) alerts.push(`📄 Carte grise ${label} : ${days <= 0 ? "EXPIRÉE" : "expire dans " + days + " j"}`);
      }
    });

    // Alertes chauffeurs (permis)
    drivers.forEach(d => {
      const label = `${d.prenom || ""} ${d.nom || ""}`.trim() || d.id;
      if (d.date_expiration_permis) {
        const days = Math.floor((new Date(d.date_expiration_permis) - now) / 86400000);
        if (days <= 60) alerts.push(`🪪 Permis ${label} : ${days <= 0 ? "EXPIRÉ" : "expire dans " + days + " j"}`);
      }
    });

    if (alerts.length === 0) {
      return Response.json({ sent: false, message: "Aucune alerte à envoyer" });
    }

    const today = now.toLocaleDateString("fr-FR");
    const message =
      `🚨 *Alertes Sierra Logistics — ${today}*\n\n` +
      alerts.join("\n") +
      `\n\n_Merci de traiter ces points rapidement._`;

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(waPhone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(waApiKey)}`;
    const resp = await fetch(url);
    const text = await resp.text();

    return Response.json({ sent: true, alerts_count: alerts.length, callmebot_response: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});