import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Mapping entités Base44 → tables Supabase
const ENTITY_TABLE_MAP = {
  Vehicle: 'vehicles',
  Driver: 'drivers',
  FuelEntry: 'fuel_entries',
  Maintenance: 'maintenance',
  Expense: 'expenses',
  Campaign: 'campaigns',
  Rotation: 'rotations',
  DailyDeclaration: 'daily_declarations',
  Client: 'clients',
  Depot: 'depots',
  SparePart: 'spare_parts',
  Supplier: 'suppliers',
  TripLog: 'trip_logs',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function supabaseRequest(method, table, body = null, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : '',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${err}`);
  }
  return res;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;
    const entityName = event?.entity_name;
    const eventType = event?.type;
    const entityId = event?.entity_id;

    const table = ENTITY_TABLE_MAP[entityName];
    if (!table) {
      return Response.json({ skipped: true, reason: `Entity ${entityName} not mapped` });
    }

    if (eventType === 'delete') {
      await supabaseRequest('DELETE', table, null, `?id=eq.${entityId}`);
      return Response.json({ success: true, action: 'delete', table, id: entityId });
    }

    // Pour create et update, on upsert
    if (data && (eventType === 'create' || eventType === 'update')) {
      const record = { ...data, id: entityId || data.id };
      await supabaseRequest('POST', table, record, '');
      return Response.json({ success: true, action: 'upsert', table, id: record.id });
    }

    // Si payload_too_large, on fetch depuis Base44
    if (payload.payload_too_large) {
      const fetched = await base44.asServiceRole.entities[entityName].get(entityId);
      const record = { ...fetched, id: entityId };
      await supabaseRequest('POST', table, record, '');
      return Response.json({ success: true, action: 'upsert_fetched', table, id: entityId });
    }

    return Response.json({ skipped: true, reason: 'No action taken' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});