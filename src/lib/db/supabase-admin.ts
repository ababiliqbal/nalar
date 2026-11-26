import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Mengembalikan singleton Supabase Service Role client khusus sisi server.
 * Dilarang keras diimpor oleh Client Component.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Konfigurasi server tidak lengkap: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib tersedia.'
    );
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedAdminClient;
}
