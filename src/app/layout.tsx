import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Luci — Inteligência em Licitações',
  description: 'Monitoramento de licitações de iluminação pública no Norte e Nordeste',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-100 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  )
}
