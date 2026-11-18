import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — hanya dibuat saat pertama kali diakses (runtime),
// bukan saat build time, sehingga tidak crash di Vercel build.
let _client: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase server credentials belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY)'
    )
  }

  _client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _client
}

// Hanya untuk Route Handlers/server. Jangan pernah import file ini di browser.
// Menggunakan Proxy agar tetap bisa di-import sebagai `supabaseAdmin.from(...)` etc.
// Client baru dibuat saat pertama kali ada method yang dipanggil (lazy init).
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin()
    const value = Reflect.get(client, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
