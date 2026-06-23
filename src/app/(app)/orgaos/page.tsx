import { buscarOrgaosCompradores, buscarUFsDisponiveis } from '@/infrastructure/database/dashboardRepository'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

function filtroHref(params: { uf?: string; licitacoes?: string; busca?: string; pagina?: number }) {
  const p = new URLSearchParams()
  if (params.busca) p.set('busca', params.busca)
  if (params.uf) p.set('uf', params.uf)
  if (params.licitacoes) p.set('licitacoes', params.licitacoes)
  if (params.pagina && params.pagina > 1) p.set('pagina', String(params.pagina))
  const q = p.toString()
  return `/orgaos${q ? `?${q}` : ''}`
}

function formatarValor(valor: number | null): string {
  if (!valor) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(valor)
}

export default async function OrgaosPage({
  searchParams,
}: {
  searchParams: Promise<{ uf?: string; licitacoes?: string; busca?: string; pagina?: string }>
}) {
  const params = await searchParams
  const uf = params.uf
  const licitacoes = params.licitacoes
  const busca = params.busca
  const minLicitacoes = licitacoes ? Number(licitacoes) : undefined
  const pagina = Number(params.pagina ?? 1)

  const [{ orgaos, total }, ufs] = await Promise.all([
    buscarOrgaosCompradores({ uf, minLicitacoes, busca, pagina }),
    buscarUFsDisponiveis(),
  ])

  const totalPaginas = Math.ceil(total / 25)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-900">Órgãos Compradores</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Instituições públicas que realizam licitações de iluminação — potenciais clientes para fornecedores.
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="busca"
          placeholder="Buscar por nome do órgão..."
          defaultValue={busca ?? ''}
          className="flex-1 rounded-lg border border-blue-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {busca && (
          <Link href="/orgaos" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Limpar
          </Link>
        )}
        <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          Buscar
        </button>
      </form>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Licitações:</span>
          <FiltroLink href={filtroHref({ uf, busca })} ativo={!licitacoes} label="Todas" />
          {([['1', '1+'], ['5', '5+'], ['10', '10+'], ['20', '20+']] as [string, string][]).map(([val, label]) => (
            <FiltroLink key={val} href={filtroHref({ uf, licitacoes: val, busca })} ativo={licitacoes === val} label={label} />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado:</span>
          <FiltroLink href={filtroHref({ licitacoes, busca })} ativo={!uf} label="Todos" />
          {ufs.map((u) => (
            <FiltroLink key={u} href={filtroHref({ uf: u, licitacoes, busca })} ativo={uf === u} label={u} />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="bg-blue-900 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Ranking por quantidade de licitações</h2>
          <span className="text-sm text-blue-300">{total} órgão{total !== 1 ? 's' : ''}</span>
        </div>

        {orgaos.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-400">
            Nenhum órgão encontrado. Tente ajustar os filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-6 py-3 text-left">Órgão / Município</th>
                  <th className="px-6 py-3 text-left">UF</th>
                  <th className="px-6 py-3 text-center">Licitações</th>
                  <th className="px-6 py-3 text-right">Valor total</th>
                  <th className="px-6 py-3 text-left">Última</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orgaos.map((o, i) => (
                  <tr key={o.orgao_cnpj} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{(pagina - 1) * 25 + i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 line-clamp-1">{o.orgao_razao_social}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{o.municipio}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                        {o.uf}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {o.total_licitacoes}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-blue-900">{formatarValor(o.valor_total)}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{format(new Date(o.ultima_data), 'dd/MM/yyyy', { locale: ptBR })}</td>
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
                <Link href={filtroHref({ uf, licitacoes, busca, pagina: pagina - 1 })} className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50">
                  ← Anterior
                </Link>
              )}
              {pagina < totalPaginas && (
                <Link href={filtroHref({ uf, licitacoes, busca, pagina: pagina + 1 })} className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50">
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

function FiltroLink({ href, ativo, label }: { href: string; ativo: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        ativo ? 'bg-blue-700 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-700'
      }`}
    >
      {label}
    </Link>
  )
}
