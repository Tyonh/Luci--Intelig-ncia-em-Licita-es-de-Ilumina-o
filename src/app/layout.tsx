import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

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

export const metadata: Metadata = {
  title: 'Luci — Inteligência em Licitações',
  description: 'Monitoramento de licitações de iluminação pública no Norte e Nordeste',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-100 text-slate-900 antialiased">
        <nav className="bg-blue-900 shadow-lg">
          <div className="mx-auto max-w-screen-2xl px-6 pt-4">
            <div className="flex items-center gap-4 pb-4">
              <div className="size-8 rounded-lg bg-blue-400 flex items-center justify-center shadow-inner">
                <span className="text-sm font-bold text-blue-950">L</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-bold text-white tracking-tight">Luci</span>
                <span className="text-blue-300 text-sm hidden sm:block">Inteligência em Licitações de Iluminação</span>
              </div>
            </div>
            <div className="flex gap-1">
              <NavTab href="/" label="Licitações" />
              <NavTab href="/fornecedores" label="Fornecedores" />
              <NavTab href="/orgaos" label="Órgãos Compradores" />
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-screen-2xl px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
