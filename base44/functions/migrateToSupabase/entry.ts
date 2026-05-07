import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

const BASE44_SYSTEM_FIELDS = ['created_by_id', 'updated_by_id', '__v', '_id', 'is_sample'];

function sanitizeRecord(record) {
  const clean = { ...record };
  for (const field of BASE44_SYSTEM_FIELDS) {
    delete clean[field];
  }
  return clean;
}

function baseHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function upsertBatch(table, records) {
  if (records.length === 0) return { inserted: 0, errors: [] };

  const sanitized = records.map(sanitizeRecord);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(sanitized),
  });

  if (!res.ok) {
    const err = await res.text();
    // Si erreur de type UUID, retenter enregistrement par enregistrement pour identifier les problèmes
    return { inserted: 0, errors: [err] };
  }

  return { inserted: records.length, errors: [] };
}

async function migrateEntity(base44, entityName, table) {
  const result = { entity: entityName, table, total: 0, inserted: 0, errors: [] };

  // Récupérer tous les enregistrements (pagination par 200)
  let allRecords = [];
  let offset = 0;
  const batchSize = 200;

  while (true) {
    const page = await base44.asServiceRole.entities[entityName].list(null, batchSize, offset);
    if (!page || page.length === 0) break;
    allRecords = allRecords.concat(page);
    if (page.length < batchSize) break;
    offset += batchSize;
  }

  result.total = allRecords.length;

  if (allRecords.length === 0) {
    return result;
  }

  // Upsert par batch de 50
  const CHUNK = 50;
  for (let i = 0; i < allRecords.length; i += CHUNK) {
    const chunk = allRecords.slice(i, i + CHUNK);
    const { inserted, errors } = await upsertBatch(table, chunk);
    result.inserted += inserted;
    result.errors = result.errors.concat(errors);
  }

  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Accès refusé — admin requis' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const entities = body.entities || Object.keys(ENTITY_TABLE_MAP);

    console.log(`[MIGRATION] Début migration de ${entities.length} entités`);

    const results = [];
    for (const entityName of entities) {
      const table = ENTITY_TABLE_MAP[entityName];
      if (!table) {
        results.push({ entity: entityName, error: 'Table non mappée' });
        continue;
      }
      console.log(`[MIGRATION] Migration de ${entityName} → ${table}`);
      const r = await migrateEntity(base44, entityName, table);
      results.push(r);
      console.log(`[MIGRATION] ${entityName}: ${r.inserted}/${r.total} — erreurs: ${r.errors.length}`);
    }

    const totalInserted = results.reduce((s, r) => s + (r.inserted || 0), 0);
    const totalRecords = results.reduce((s, r) => s + (r.total || 0), 0);
    const hasErrors = results.some(r => r.errors && r.errors.length > 0);

    return Response.json({
      success: !hasErrors,
      summary: { totalRecords, totalInserted, entities: results.length },
      results,
    });
  } catch (error) {
    console.error('[MIGRATION ERROR]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});