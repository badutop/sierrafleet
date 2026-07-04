import { supabase } from '@/lib/supabaseClient';

/**
 * Crée un accesseur CRUD pour une table Supabase, avec une interface
 * proche de base44.entities.X pour limiter les changements dans les pages.
 *
 * Usage :
 *   export const Vehicle = createSupabaseEntity('vehicles');
 *   await Vehicle.list();
 *   await Vehicle.create({ ... });
 *   await Vehicle.update(id, { ... });
 *   await Vehicle.delete(id);
 */
export function createSupabaseEntity(table) {
  return {
    async list(orderBy = 'created_date', ascending = false) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(orderBy, { ascending });
      if (error) throw error;
      return data;
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },
  };
}
