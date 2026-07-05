import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data, changed_fields } = body;

    let userEmail = "système";
    try {
      const user = await base44.auth.me();
      if (user?.email) userEmail = user.email;
    } catch (_e) {
      // pas d'utilisateur authentifié (déclenché par une automatisation)
    }

    const actionLabels = { create: "Création", update: "Modification", delete: "Suppression" };
    const entityName = event?.entity_name || "Inconnu";
    const action = event?.type || "update";
    const summary = `${actionLabels[action] || action} sur ${entityName}`;

    const record = {
      entity_name: entityName,
      entity_id: event?.entity_id || "",
      action,
      changed_fields: Array.isArray(changed_fields) ? changed_fields : [],
      user_email: userEmail,
      summary,
      old_data: old_data ? JSON.stringify(old_data).slice(0, 5000) : "",
      new_data: data ? JSON.stringify(data).slice(0, 5000) : "",
    };

    await base44.asServiceRole.entities.AuditLog.create(record);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});