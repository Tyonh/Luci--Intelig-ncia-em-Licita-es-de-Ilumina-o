import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Sem sessão — manda pro login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verifica cargo na tabela perfis
  const { data: perfil } = await supabase
    .from('perfis')
    .select('cargo')
    .eq('id', user.id)
    .single()

  const cargoValido = perfil?.cargo === 'admin' || perfil?.cargo === 'vendedor'
  if (!cargoValido) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?erro=sem_acesso', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!login|_next/static|_next/image|favicon.ico|api/health).*)',
  ],
}
