import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the service role key.
 * This bypasses RLS and should only be used in server-side code
 * for administrative operations like auth callbacks.
 */
export function createServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
