import Link from 'next/link'
import { getPerfilAtual } from '@/lib/supabase/server'
import { logoutAction } from '@/app/(auth)/login/actions'

function NavTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-t-lg px-4 py-2.5 text-sm font-medium text-blue-200 hover:bg-blue-800 hover:text-white transition-colors"
    >
      {label}
    </Link>
  )
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfilAtual().catch(() => null)

  return (
    <>
      <nav className="bg-blue-900 shadow-lg">
        <div className="mx-auto max-w-screen-2xl px-6 pt-4">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-4">
              <div className="size-8 rounded-lg bg-blue-400 flex items-center justify-center shadow-inner">
                <span className="text-sm font-bold text-blue-950">L</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-bold text-white tracking-tight">Luci</span>
                <span className="text-blue-300 text-sm hidden sm:block">Inteligência em Licitações de Iluminação</span>
              </div>
            </div>
            {perfil && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-white">{perfil.nome}</div>
                  <div className="text-xs text-blue-300 capitalize">{perfil.cargo}</div>
                </div>
                <form action={logoutAction}>
                  <button type="submit" className="rounded-lg border border-blue-700 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-800 transition-colors">
                    Sair
                  </button>
                </form>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <NavTab href="/" label="Licitações" />
            <NavTab href="/fornecedores" label="Fornecedores" />
            <NavTab href="/orgaos" label="Órgãos Compradores" />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-screen-2xl px-6 py-8">{children}</main>
    </>
  )
}
