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

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function baseHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

// Champs système Base44 à exclure (non présents dans Supabase)
const BASE44_SYSTEM_FIELDS = ['created_by_id', 'updated_by_id', '__v', '_id', 'is_sample'];

function sanitizeRecord(record) {
  const clean = { ...record };
  for (const field of BASE44_SYSTEM_FIELDS) {
    delete clean[field];
  }
  return clean;
}

async function upsertRecord(table, record) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  console.log(`[upsert] POST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([sanitizeRecord(record)]),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upsert ${table}: ${err}`);
  }
}

async function deleteRecord(table, id) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  console.log(`[delete] DELETE ${url}`);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: baseHeaders(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase delete ${table}: ${err}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    console.log('[DEBUG] SUPABASE_URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 40) : 'VIDE');
    console.log('[DEBUG] KEY exists:', !!SUPABASE_KEY);

    const { event, data } = payload;
    const entityName = event?.entity_name;
    const eventType = event?.type;
    const entityId = event?.entity_id;

    const table = ENTITY_TABLE_MAP[entityName];
    if (!table) {
      return Response.json({ skipped: true, reason: `Entity ${entityName} not mapped` });
    }

    console.log(`[DEBUG] entityName=${entityName} eventType=${eventType} entityId=${entityId} table=${table}`);

    if (eventType === 'delete') {
      await deleteRecord(table, entityId);
      return Response.json({ success: true, action: 'delete', table, id: entityId });
    }

    // Pour create et update, on upsert
    if (eventType === 'create' || eventType === 'update') {
      let record = data ? { ...data, id: entityId || data.id } : null;

      // Si payload trop grand, on fetche depuis Base44
      if (!record || payload.payload_too_large) {
        const fetched = await base44.asServiceRole.entities[entityName].get(entityId);
        record = { ...fetched, id: entityId };
      }

      await upsertRecord(table, record);
      return Response.json({ success: true, action: 'upsert', table, id: record.id });
    }

    return Response.json({ skipped: true, reason: 'No action taken' });
  } catch (error) {
    console.error('[ERROR]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});