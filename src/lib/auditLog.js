import { supabase } from "@/lib/supabaseClient";

// Enveloppe l'Edge Function log-audit. Volontairement silencieuse en cas
// d'échec : la traçabilité ne doit jamais faire échouer l'action métier
// réelle (création/modification/suppression) qu'elle décrit.
export async function logAudit(entityName, entityId, type, data, oldData, changedFields) {
  try {
    const { error } = await supabase.functions.invoke("log-audit", {
      body: {
        event: { entity_name: entityName, entity_id: entityId, type },
        data: data ?? null,
        old_data: oldData ?? null,
        changed_fields: changedFields || [],
      },
    });
    if (error) console.error(`[logAudit] ${entityName} ${type} a échoué:`, error.message);
  } catch (err) {
    console.error(`[logAudit] ${entityName} ${type} a levé une exception:`, err);
  }
}
