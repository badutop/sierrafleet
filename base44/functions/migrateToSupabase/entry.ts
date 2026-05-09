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

// Colonnes attendues par table Supabase (basé sur le schéma SQL)
const SUPABASE_COLUMNS = {
  vehicles: ['id', 'code_camion', 'immatriculation', 'marque', 'modele', 'type_vehicule', 'annee', 'couleur', 'photo_url', 'statut', 'driver_id', 'km_actuel', 'capacite_charge_tonnes', 'date_assurance', 'date_visite_technique', 'date_carte_grise', 'km_derniere_vidange', 'date_derniere_vidange', 'km_prochaine_vidange', 'doc_carte_grise_url', 'doc_assurance_url', 'doc_visite_technique_url', 'created_date', 'updated_date', 'created_by'],
  drivers: ['id', 'nom', 'prenom', 'telephone', 'numero_permis', 'categorie_permis', 'date_expiration_permis', 'date_embauche', 'contact_urgence_nom', 'contact_urgence_telephone', 'photo_url', 'statut', 'doc_permis_url', 'doc_cni_url', 'created_date', 'updated_date', 'created_by'],
  clients: ['id', 'nom', 'code_client', 'zone', 'contact_nom', 'contact_telephone', 'consommation_estimee_litres', 'actif', 'created_date', 'updated_date', 'created_by'],
  depots: ['id', 'client_id', 'nom_depot', 'adresse', 'latitude', 'longitude', 'zone', 'actif', 'created_date', 'updated_date', 'created_by'],
  suppliers: ['id', 'nom', 'telephone', 'email', 'adresse', 'actif', 'created_date', 'updated_date', 'created_by'],
  fuel_entries: ['id', 'vehicle_id', 'date', 'station', 'litres', 'prix_litre', 'montant_total', 'km_compteur', 'recu_url', 'statut', 'created_date', 'updated_date', 'created_by'],
  maintenance: ['id', 'vehicle_id', 'categorie', 'type_entretien', 'designation', 'description_panne', 'date_entretien', 'date_fin_intervention', 'duree_immobilisation_jours', 'prestataire', 'cout', 'cout_pieces', 'cout_main_oeuvre', 'pieces_remplacees', 'km_entretien', 'prochaine_date', 'prochain_km', 'prochain_nb_rotations', 'statut', 'gravite', 'observations', 'created_date', 'updated_date', 'created_by'],
  expenses: ['id', 'vehicle_id', 'driver_id', 'trip_id', 'type_frais', 'date_frais', 'montant', 'description', 'justificatif_url', 'statut', 'collecteur', 'executeur', 'created_date', 'updated_date', 'created_by'],
  spare_parts: ['id', 'reference', 'designation', 'categorie', 'etat', 'quantite_stock', 'quantite_min', 'prix_unitaire', 'supplier_id', 'notes', 'created_date', 'updated_date', 'created_by'],
  campaigns: ['id', 'nom_campagne', 'client_id', 'type_marchandise', 'point_origine', 'depot_destination_id', 'date_debut', 'date_fin_prevue', 'tonnage_total_prevu', 'tonnage_realise', 'nombre_rotations_prevues', 'nombre_rotations_realisees', 'statut', 'observations', 'created_date', 'updated_date', 'created_by'],
  rotations: ['id', 'campaign_id', 'vehicle_id', 'driver_id', 'numero_rotation', 'numero_bon_client', 'date_rotation', 'heure_depart_port', 'heure_arrivee_depot', 'poids_charge_tonnes', 'litres_carburant_alloues', 'litres_carburant_reel', 'km_depart', 'km_arrivee', 'refuel_declenche', 'bon_physique_recu', 'statut', 'observations', 'created_date', 'updated_date', 'created_by'],
  daily_declarations: ['id', 'campaign_id', 'vehicle_id', 'driver_id', 'date_declaration', 'bl_navire', 'type_marchandise', 'nombre_rotations_jour', 'tonnage_total_jour', 'bons_systeme', 'bons_physiques', 'ecart_bons', 'litres_carburant_consommes', 'statut_validation', 'valide_par', 'observations', 'created_date', 'updated_date', 'created_by'],
  trip_logs: ['id', 'vehicle_id', 'driver_id', 'date_depart', 'date_retour', 'mission', 'destination', 'departement', 'km_depart', 'km_arrivee', 'km_parcourus', 'litres_carburant', 'cout_carburant', 'consommation_l100', 'cout_par_km', 'observations', 'statut', 'created_date', 'updated_date', 'created_by'],
};

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const BASE44_SYSTEM_FIELDS = ['created_by_id', 'updated_by_id', '__v', '_id', 'is_sample'];

function sanitizeForSupabase(record, table) {
  const allowedColumns = SUPABASE_COLUMNS[table] || [];
  const clean = {};

  for (const [key, value] of Object.entries(record)) {
    // Exclure champs système Base44
    if (BASE44_SYSTEM_FIELDS.includes(key)) continue;
    
    // Exclure colonnes non présentes dans Supabase
    if (!allowedColumns.includes(key)) continue;
    
    // Convertir les chaînes vides en null pour les dates/nombres
    if (value === '') {
      clean[key] = null;
    } else {
      clean[key] = value;
    }
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

  const sanitized = records.map(r => sanitizeForSupabase(r, table));
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
    return { inserted: 0, errors: [err] };
  }

  return { inserted: records.length, errors: [] };
}

async function migrateEntity(base44, entityName, table) {
  const result = { entity: entityName, table, total: 0, inserted: 0, errors: [] };

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