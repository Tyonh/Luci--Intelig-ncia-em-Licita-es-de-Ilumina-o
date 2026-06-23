import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type { Database }

// Auth — projeto compartilhado com os outros sistemas da empresa
const authUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
const authAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

// Dados — projeto exclusivo do Luci (fallback para o mesmo projeto se não definido)
const dadosUrl = process.env['LUCI_SUPABASE_URL'] ?? authUrl
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!authUrl || !authAnonKey) {
  throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias')
}
if (!dadosUrl) {
  throw new Error('LUCI_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL é obrigatória')
}

// Cliente público — Auth do projeto compartilhado (respeita RLS, gerencia sessão)
export const supabase = createClient(authUrl, authAnonKey)

// Cliente admin — aponta para o projeto de dados do Luci (bypassa RLS, server-only)
export const supabaseAdmin = createClient<Database>(
  dadosUrl,
  serviceKey ?? authAnonKey,
  { auth: { persistSession: false } }
)
