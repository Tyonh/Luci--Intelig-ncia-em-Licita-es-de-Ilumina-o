import { buscarDetalhe } from '@/infrastructure/database/dashboardRepository'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { notFound } from 'next/navigation'

function urlPNCP(numeroControlePNCP: string): string {
  const m = numeroControlePNCP.match(/^(\d+)-\d+-(\d+)\/(\d{4})$/)
  if (!m?.[1] || !m[2] || !m[3]) return 'https://pncp.gov.br'
  return `https://pncp.gov.br/app/editais/${m[1]}/${m[3]}/${parseInt(m[2], 10)}`
}

function formatarValor(valor: number | null | string): string {
  if (!valor) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))
}

function formatarData(data: string | null): string {
  if (!data) return '—'
  return format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
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
  CABO_ELETRICO: 'Cabo Elétrico',
  SERVICO_INSTALACAO: 'Serviço / Instalação',
  OUTROS_ELETRICOS: 'Outros Elétricos',
}

export default async function DetalheLicitacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resultado = await buscarDetalhe(id)
  if (!resultado) notFound()

  const { licitacao: l, itens, resultadosPorItem } = resultado
  const confiancaPct = Math.round(Number(l.confianca_media) * 100)

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
        ← Voltar para o painel
      </Link>

      {/* Cabeçalho */}
      <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
        <div className="bg-blue-900 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">{l.orgao_razao_social}</h1>
              <p className="text-blue-300 text-sm mt-1">{l.municipio} · {l.uf}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={urlPNCP(l.numero_controle_pncp)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-300 transition-colors"
              >
                Ver no PNCP ↗
              </a>
              {l.link_sistema_origem && (
                <a
                  href={l.link_sistema_origem}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-blue-400 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-800 transition-colors"
                >
                  Sistema origem →
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Campo label="Modalidade" valor={l.modalidade_nome ?? '—'} />
          <Campo label="Situação" valor={l.situacao_nome ?? '—'} />
          <Campo label="Publicação" valor={formatarData(l.data_publicacao)} />
          <Campo label="Encerramento" valor={formatarData(l.data_encerramento)} />
          <Campo label="Valor estimado" valor={formatarValor(l.valor_total_estimado)} destaque />
          <Campo label="Valor homologado" valor={formatarValor(l.valor_total_homologado)} />
          <Campo label="Controle PNCP" valor={l.numero_controle_pncp} mono />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Confiança</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-blue-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${confiancaPct}%` }}
                />
              </div>
              <span className="text-sm font-bold text-blue-700">{confiancaPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Itens elegíveis */}
      <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
        <div className="bg-blue-900 px-6 py-4 flex items-center gap-3">
          <h2 className="font-semibold text-white">Itens de iluminação identificados</h2>
          <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs font-semibold text-blue-100">
            {itens.length}
          </span>
        </div>

        {itens.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">Nenhum item registrado.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {itens.map((item: {
              id: string; numero_item: number; descricao: string; categoria: string | null
              confianca: string | number | null; codigo_material: string | null
              quantidade_total: number | null; unidade_medida: string | null
              valor_unitario_estimado: number | null
            }) => {
              const vencedores = resultadosPorItem[item.numero_item] ?? []
              return (
                <div key={item.id} className="px-6 py-5 hover:bg-blue-50/40 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5">
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {item.numero_item}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 leading-relaxed">{item.descricao}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.categoria && (
                          <span className="inline-flex items-center rounded-md bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white">
                            {CATEGORIA_LABEL[item.categoria] ?? item.categoria}
                          </span>
                        )}
                        {item.codigo_material && (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-600">
                            CATMAT {item.codigo_material}
                          </span>
                        )}
                        {item.quantidade_total != null && item.unidade_medida && (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                            {item.quantidade_total} {item.unidade_medida}
                          </span>
                        )}
                        {item.valor_unitario_estimado != null && (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                            Unit. est. {formatarValor(item.valor_unitario_estimado)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className={`text-xs font-bold ${Number(item.confianca) >= 0.8 ? 'text-blue-700' : 'text-sky-600'}`}>
                        {Math.round(Number(item.confianca) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Vencedor(es) do item */}
                  {vencedores.length > 0 && (
                    <div className="mt-4 ml-11 space-y-2">
                      {vencedores.map((v: {
                        id: string; nome_fornecedor: string; ni_fornecedor: string
                        porte_fornecedor: string | null; valor_total_homologado: number | null
                        valor_unitario_homologado: number | null; quantidade_homologada: number | null
                        percentual_desconto: number | null
                      }) => (
                        <div key={v.id} className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                  Venceu
                                </span>
                                <span className="font-medium text-slate-900 text-sm truncate">{v.nome_fornecedor}</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-500 font-mono">{formatarCnpj(v.ni_fornecedor)}</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="font-mono font-semibold text-green-800 text-sm">{formatarValor(v.valor_total_homologado)}</div>
                              {v.percentual_desconto != null && Number(v.percentual_desconto) > 0 && (
                                <div className="text-xs text-green-600">−{Number(v.percentual_desconto).toFixed(1)}% desc.</div>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {v.porte_fornecedor && (
                              <span className="inline-flex items-center rounded bg-white px-2 py-0.5 text-slate-600 ring-1 ring-green-200">
                                {v.porte_fornecedor}
                              </span>
                            )}
                            {v.valor_unitario_homologado != null && (
                              <span className="inline-flex items-center rounded bg-white px-2 py-0.5 text-slate-600 ring-1 ring-green-200">
                                Unit. {formatarValor(v.valor_unitario_homologado)}
                              </span>
                            )}
                            {v.quantidade_homologada != null && (
                              <span className="inline-flex items-center rounded bg-white px-2 py-0.5 text-slate-600 ring-1 ring-green-200">
                                Qtd. {v.quantidade_homologada}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Campo({ label, valor, destaque, mono }: { label: string; valor: string; destaque?: boolean; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1.5 ${destaque ? 'text-base font-bold text-blue-900' : 'text-sm text-slate-700'} ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {valor}
      </div>
    </div>
  )
}
