import { buscarFornecedores, buscarUFsFornecedores } from '@/infrastructure/database/dashboardRepository'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

function formatarValor(valor: number | null): string {
  if (!valor) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(valor)
}

function formatarCnpj(ni: string): string {
  const d = ni.replace(/\D/g, '')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return ni
}

const CATEGORIA_LABEL: Record<string, string> = {
  LUMINARIA_LED: 'Luminária LED',
  REFLETOR: 'Refletor',
  POSTE: 'Poste',
  CONTROLADOR: 'Controlador',
  CABO_ELETRICO: 'Cabo',
  SERVICO_INSTALACAO: 'Serviço',
  OUTROS_ELETRICOS: 'Outros',
}

function filtroHref(params: { porte?: string; uf?: string; vitorias?: string; busca?: string; pagina?: number }) {
  const p = new URLSearchParams()
  if (params.busca) p.set('busca', params.busca)
  if (params.porte) p.set('porte', params.porte)
  if (params.uf) p.set('uf', params.uf)
  if (params.vitorias) p.set('vitorias', params.vitorias)
  if (params.pagina && params.pagina > 1) p.set('pagina', String(params.pagina))
  const q = p.toString()
  return `/fornecedores${q ? `?${q}` : ''}`
}

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ porte?: string; uf?: string; vitorias?: string; busca?: string; pagina?: string }>
}) {
  const params = await searchParams
  const porte = params.porte
  const uf = params.uf
  const vitorias = params.vitorias
  const busca = params.busca
  const minVitorias = vitorias ? Number(vitorias) : undefined
  const pagina = Number(params.pagina ?? 1)

  const [{ fornecedores, total }, ufsDisponiveis] = await Promise.all([
    buscarFornecedores({ porte, uf, minVitorias, busca, pagina }),
    buscarUFsFornecedores(),
  ])
  const totalPaginas = Math.ceil(total / 25)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-900">Fornecedores do mercado</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Empresas que já venceram licitações de iluminação — concorrentes diretos e potenciais parceiros, com histórico de preços praticados.
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="busca"
          placeholder="Buscar por nome ou CNPJ..."
          defaultValue={busca ?? ''}
          className="flex-1 rounded-lg border border-blue-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {busca && (
          <Link href="/fornecedores" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Limpar
          </Link>
        )}
        <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          Buscar
        </button>
      </form>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Porte:</span>
          <FiltroLink href={filtroHref({ uf, vitorias, busca })} ativo={!porte} label="Todos" />
          <FiltroLink href={filtroHref({ porte: 'ME', uf, vitorias, busca })} ativo={porte === 'ME'} label="ME" />
          <FiltroLink href={filtroHref({ porte: 'EPP', uf, vitorias, busca })} ativo={porte === 'EPP'} label="EPP" />
          <FiltroLink href={filtroHref({ porte: 'Demais', uf, vitorias, busca })} ativo={porte === 'Demais'} label="Demais" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vitórias:</span>
          <FiltroLink href={filtroHref({ porte, uf, busca })} ativo={!vitorias} label="Todas" />
          {([['1', '1+'], ['5', '5+'], ['10', '10+'], ['20', '20+']] as [string, string][]).map(([val, label]) => (
            <FiltroLink key={val} href={filtroHref({ porte, uf, vitorias: val, busca })} ativo={vitorias === val} label={label} />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado:</span>
          <FiltroLink href={filtroHref({ porte, vitorias, busca })} ativo={!uf} label="Todos" />
          {ufsDisponiveis.map((u) => (
            <FiltroLink key={u} href={filtroHref({ porte, uf: u, vitorias, busca })} ativo={uf === u} label={u} />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="bg-blue-900 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Ranking por valor homologado</h2>
          <span className="text-sm text-blue-300">{total} empresa{total !== 1 ? 's' : ''}</span>
        </div>

        {fornecedores.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-400">
            Nenhum fornecedor registrado ainda. Eles aparecem quando uma licitação é homologada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-6 py-3 text-left">Empresa</th>
                  <th className="px-6 py-3 text-left">Porte</th>
                  <th className="px-6 py-3 text-center">Vitórias</th>
                  <th className="px-6 py-3 text-right">Total homologado</th>
                  <th className="px-6 py-3 text-right">Ticket médio</th>
                  <th className="px-6 py-3 text-left">Categorias</th>
                  <th className="px-6 py-3 text-left">UFs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fornecedores.map((f, i) => (
                  <tr key={f.ni} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{(pagina - 1) * 25 + i + 1}</td>
                    <td className="px-6 py-4">
                      <Link href={`/fornecedores/${f.ni}`} className="block">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">{f.nome}</span>
                          {f.total_filiais && f.total_filiais > 0 ? (
                            <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                              +{f.total_filiais} filial{f.total_filiais !== 1 ? 'is' : ''}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{formatarCnpj(f.ni)}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {f.porte && (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                          {f.porte}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {f.total_homologacoes}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-blue-900">{formatarValor(f.valor_total_homologado)}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600 text-xs">{formatarValor(f.ticket_medio)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {f.categorias.slice(0, 3).map((c) => (
                          <span key={c} className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                            {CATEGORIA_LABEL[c] ?? c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {f.ufs_atuacao.slice(0, 4).map((u) => (
                          <span key={u} className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                            {u}
                          </span>
                        ))}
                      </div>
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
                <Link href={filtroHref({ porte, uf, vitorias, busca, pagina: pagina - 1 })} className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50">
                  ← Anterior
                </Link>
              )}
              {pagina < totalPaginas && (
                <Link href={filtroHref({ porte, uf, vitorias, busca, pagina: pagina + 1 })} className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50">
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        {fornecedores.length > 0 && fornecedores[0]?.ultima_homologacao &&
          `Última homologação registrada: ${format(new Date(fornecedores[0].ultima_homologacao), "dd/MM/yyyy", { locale: ptBR })}`}
      </p>
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
