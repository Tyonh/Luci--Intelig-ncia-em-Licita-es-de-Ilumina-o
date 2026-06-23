import { buscarStats, buscarLicitacoes, buscarUFsDisponiveis } from '@/infrastructure/database/dashboardRepository'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

// numeroControlePNCP = "{cnpj}-{poderId}-{seq}/{ano}"
// URL do portal = pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}
function urlPNCP(numeroControlePNCP: string): string {
  const m = numeroControlePNCP.match(/^(\d+)-\d+-(\d+)\/(\d{4})$/)
  if (!m?.[1] || !m[2] || !m[3]) return 'https://pncp.gov.br'
  return `https://pncp.gov.br/app/editais/${m[1]}/${m[3]}/${parseInt(m[2], 10)}`
}

function formatarValor(valor: number | null): string {
  if (!valor) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(valor)
}

function formatarData(data: string | null): string {
  if (!data) return '—'
  return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR })
}

function BadgeConfianca({ valor }: { valor: number }) {
  const pct = Math.round(valor * 100)
  const cor = pct >= 80
    ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200'
    : pct >= 60
    ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
    : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cor}`}>
      {pct}%
    </span>
  )
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ uf?: string; pagina?: string }>
}) {
  const params = await searchParams
  const uf = params.uf
  const pagina = Number(params.pagina ?? 1)

  const [stats, { licitacoes, total }, ufs] = await Promise.all([
    buscarStats(),
    buscarLicitacoes({ uf, pagina }),
    buscarUFsDisponiveis(),
  ])

  const totalPaginas = Math.ceil(total / 20)

  return (
    <div className="space-y-7">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total elegíveis" value={stats.total_elegiveis.toString()} accent />
        <StatCard label="Coletadas hoje" value={stats.total_hoje.toString()} />
        <StatCard label="UFs cobertas" value={stats.ufs_cobertas.toString()} />
        <StatCard
          label="Última coleta"
          value={stats.ultima_coleta
            ? format(new Date(stats.ultima_coleta), 'HH:mm, dd/MM', { locale: ptBR })
            : 'Nunca'}
        />
      </div>

      {/* Filtros UF */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado:</span>
        <FiltroLink href="/" ativo={!uf} label="Todos" />
        {ufs.map((u) => (
          <FiltroLink key={u} href={`/?uf=${u}`} ativo={uf === u} label={u} />
        ))}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="bg-blue-900 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">
            Licitações elegíveis
            {uf && <span className="ml-2 text-blue-300 font-normal">· {uf}</span>}
          </h2>
          <span className="text-sm text-blue-300">{total} resultado{total !== 1 ? 's' : ''}</span>
        </div>

        {licitacoes.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-400">
            Nenhuma licitação encontrada. Execute a coleta primeiro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left">Órgão / Município</th>
                  <th className="px-6 py-3 text-left">UF</th>
                  <th className="px-6 py-3 text-left">Modalidade</th>
                  <th className="px-6 py-3 text-right">Valor est.</th>
                  <th className="px-6 py-3 text-left">Publicação</th>
                  <th className="px-6 py-3 text-left">Encerramento</th>
                  <th className="px-6 py-3 text-center">Confiança</th>
                  <th className="px-6 py-3 text-center">Itens</th>
                  <th className="px-6 py-3 text-center">Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licitacoes.map((l) => (
                  <tr key={l.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <Link href={`/licitacoes/${l.id}`}>
                        <div className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                          {l.orgao_razao_social}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{l.municipio}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                        {l.uf}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{l.modalidade_nome ?? '—'}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-700 text-xs">{formatarValor(l.valor_total_estimado)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatarData(l.data_publicacao)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatarData(l.data_encerramento)}</td>
                    <td className="px-6 py-4 text-center">
                      <BadgeConfianca valor={l.confianca_media} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {l.total_itens}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <a
                        href={urlPNCP(l.numero_controle_pncp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        PNCP ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50">
            <span className="text-sm text-slate-500">Página {pagina} de {totalPaginas}</span>
            <div className="flex gap-2">
              {pagina > 1 && (
                <Link
                  href={`/?${uf ? `uf=${uf}&` : ''}pagina=${pagina - 1}`}
                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              {pagina < totalPaginas && (
                <Link
                  href={`/?${uf ? `uf=${uf}&` : ''}pagina=${pagina + 1}`}
                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${accent ? 'bg-blue-900 border-blue-800' : 'bg-white border-blue-100'}`}>
      <div className={`text-xs font-semibold uppercase tracking-wider ${accent ? 'text-blue-300' : 'text-slate-400'}`}>
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold ${accent ? 'text-white' : 'text-blue-900'}`}>
        {value}
      </div>
    </div>
  )
}

function FiltroLink({ href, ativo, label }: { href: string; ativo: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        ativo
          ? 'bg-blue-700 text-white shadow-sm'
          : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-700'
      }`}
    >
      {label}
    </Link>
  )
}
