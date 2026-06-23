import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type { Database }

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias')
}

// Cliente público — usado no frontend (respeita RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Cliente admin — usado apenas em Server Actions e jobs (bypassa RLS)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey ?? supabaseAnonKey,
  { auth: { persistSession: false } }
)
