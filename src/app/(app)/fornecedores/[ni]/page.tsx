import { supabaseAdmin } from '@/infrastructure/database/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Socio {
  nome: string; qualificacao: string | null; nomeRepresentante: string | null
}

interface ResultadoHistorico {
  licitacao_id: string; numero_item: number
  valor_total_homologado: number | null; percentual_desconto: number | null; data_resultado: string | null
  licitacoes: { orgao_razao_social: string; municipio: string; uf: string; numero_controle_pncp: string } | null
}

interface FornecedorCompleto {
  ni: string; nome: string; tipo_pessoa: string | null; porte: string | null
  total_homologacoes: number; valor_total_homologado: number; ticket_medio: number | null
  categorias: unknown; ufs_atuacao: unknown; primeira_homologacao: string | null; ultima_homologacao: string | null
  nome_fantasia: string | null; email: string | null; telefone1: string | null; telefone2: string | null
  logradouro: string | null; numero: string | null; complemento: string | null; bairro: string | null
  municipio_cnpj: string | null; uf_cnpj: string | null; cep: string | null
  situacao_cadastral: string | null; data_abertura: string | null; natureza_juridica: string | null
  capital_social: number | null; atividade_principal: { codigo: string; descricao: string } | null
  cnaes_secundarios: unknown; socios: unknown; enriquecido_em: string | null
  cnpj_raiz: string | null
}

interface Filial {
  ni: string; nome: string; municipio_cnpj: string | null; uf_cnpj: string | null
  situacao_cadastral: string | null; total_homologacoes: number
  valor_total_homologado: number; email: string | null; telefone1: string | null
  enriquecido_em: string | null
}

function fmt(v: number | null, style: 'currency' | 'decimal' = 'currency'): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style, currency: 'BRL',
    maximumFractionDigits: style === 'currency' ? 2 : 0,
  }).format(v)
}

function fmtCnpj(ni: string): string {
  const d = ni.replace(/\D/g, '')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return ni
}

const CAT_LABEL: Record<string, string> = {
  LUMINARIA_LED: 'Luminária LED', REFLETOR: 'Refletor', POSTE: 'Poste',
  CONTROLADOR: 'Controlador', SERVICO_INSTALACAO: 'Serviço/Instalação', OUTROS_ELETRICOS: 'Outros',
}

export default async function FornecedorDetalhe({ params }: { params: Promise<{ ni: string }> }) {
  const { ni } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: f } = await (supabaseAdmin as any)
    .from('fornecedores')
    .select('*')
    .eq('ni', ni)
    .single() as { data: FornecedorCompleto | null }

  if (!f) notFound()

  // Busca filiais/matriz do mesmo grupo (mesmo cnpj_raiz, exceto o próprio)
  const cnpjRaiz = f.cnpj_raiz ?? f.ni.slice(0, 8)
  const { data: filiais } = await (supabaseAdmin as any)
    .from('fornecedores')
    .select('ni, nome, municipio_cnpj, uf_cnpj, situacao_cadastral, total_homologacoes, valor_total_homologado, email, telefone1, enriquecido_em')
    .eq('cnpj_raiz', cnpjRaiz)
    .neq('ni', ni)
    .order('total_homologacoes', { ascending: false }) as { data: Filial[] | null }

  const grupoTotal = (filiais ?? []).reduce(
    (acc, fil) => ({
      homologacoes: acc.homologacoes + (fil.total_homologacoes ?? 0),
      valor: acc.valor + (fil.valor_total_homologado ?? 0),
    }),
    { homologacoes: f.total_homologacoes, valor: f.valor_total_homologado }
  )

  // Últimas licitações onde venceu
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: resultados } = await (supabaseAdmin as any)
    .from('resultados_item')
    .select('licitacao_id, numero_item, valor_total_homologado, percentual_desconto, data_resultado, licitacoes(orgao_razao_social, municipio, uf, numero_controle_pncp)')
    .eq('ni_fornecedor', ni)
    .order('data_resultado', { ascending: false })
    .limit(20) as { data: ResultadoHistorico[] | null }

  const socios = Array.isArray(f.socios) ? f.socios as Socio[] : []
  const cnaes = Array.isArray(f.cnaes_secundarios) ? f.cnaes_secundarios as { codigo: string; descricao: string }[] : []
  const ativPrincipal = f.atividade_principal as { codigo: string; descricao: string } | null

  const enriquecido = !!f.enriquecido_em

  return (
    <div className="space-y-6">
      <Link href="/fornecedores" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
        ← Voltar para fornecedores
      </Link>

      {/* Cabeçalho */}
      <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
        <div className="bg-blue-900 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">{f.nome}</h1>
              {f.nome_fantasia && f.nome_fantasia !== f.nome && (
                <p className="text-blue-300 text-sm mt-0.5">"{f.nome_fantasia}"</p>
              )}
              <p className="text-blue-400 font-mono text-sm mt-1">{fmtCnpj(f.ni)}</p>
            </div>
            <div className="shrink-0 text-right space-y-1">
              {f.situacao_cadastral && (
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                  f.situacao_cadastral === 'ATIVA' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {f.situacao_cadastral}
                </span>
              )}
              {f.porte && (
                <div className="text-blue-300 text-xs">{f.porte}</div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Info label="Vitórias" value={String(f.total_homologacoes)} />
          <Info label="Total homologado" value={fmt(f.valor_total_homologado)} destaque />
          <Info label="Ticket médio" value={fmt(f.ticket_medio)} />
          <Info label="Capital social" value={fmt(f.capital_social)} />
          <Info label="Natureza jurídica" value={f.natureza_juridica ?? '—'} />
          <Info label="Abertura" value={f.data_abertura ? format(new Date(f.data_abertura), 'dd/MM/yyyy', { locale: ptBR }) : '—'} />
          <Info label="Primeira homologação" value={f.primeira_homologacao ? format(new Date(f.primeira_homologacao), 'dd/MM/yyyy', { locale: ptBR }) : '—'} />
          <Info label="Última homologação" value={f.ultima_homologacao ? format(new Date(f.ultima_homologacao), 'dd/MM/yyyy', { locale: ptBR }) : '—'} />
        </div>
      </div>

      {/* Painel de grupo empresarial */}
      {filiais && filiais.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
          <div className="bg-amber-500 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">Grupo empresarial</span>
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white">
                {filiais.length} {filiais.length === 1 ? 'filial' : 'filiais'} encontrada{filiais.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs text-amber-100">Total consolidado do grupo</div>
              <div className="text-white font-bold text-sm">
                {grupoTotal.homologacoes} vitórias · {fmt(grupoTotal.valor)}
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs text-amber-700 mb-4">
              Este CNPJ ({cnpjRaiz}****) possui outras unidades ativas no sistema. Cada filial é um ponto de contato independente — oportunidade de abordagem comercial.
            </p>
            <div className="space-y-3">
              {filiais.map((fil) => (
                <div key={fil.ni} className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3 gap-4">
                  <div className="min-w-0">
                    <Link href={`/fornecedores/${fil.ni}`} className="font-medium text-slate-800 hover:text-blue-700 text-sm line-clamp-1">
                      {fil.nome}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono">{fmtCnpj(fil.ni)}</span>
                      {fil.municipio_cnpj && (
                        <span className="text-xs text-slate-400">· {fil.municipio_cnpj}/{fil.uf_cnpj}</span>
                      )}
                      {fil.situacao_cadastral && (
                        <span className={`text-xs font-semibold ${fil.situacao_cadastral === 'ATIVA' ? 'text-green-600' : 'text-red-500'}`}>
                          · {fil.situacao_cadastral}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {fil.email && (
                        <a href={`mailto:${fil.email}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          ✉ {fil.email}
                        </a>
                      )}
                      {fil.telefone1 && (
                        <a href={`tel:${fil.telefone1}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          ☎ {fil.telefone1}
                        </a>
                      )}
                      {!fil.enriquecido_em && (
                        <span className="text-xs text-slate-400 italic">dados pendentes de enriquecimento</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-blue-900">{fil.total_homologacoes}</div>
                    <div className="text-xs text-slate-400">vitórias</div>
                    <div className="text-xs font-semibold text-slate-600 mt-0.5">{fmt(fil.valor_total_homologado)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contato e endereço */}
        <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-5 py-3">
            <h2 className="font-semibold text-white text-sm">Contato e endereço</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {!enriquecido && (
              <p className="text-sm text-slate-400 italic">Dados não enriquecidos ainda. Execute o job de enriquecimento.</p>
            )}
            {f.email && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 w-20 shrink-0">E-mail</span>
                <a href={`mailto:${f.email}`} className="text-sm text-blue-700 hover:underline break-all">{f.email}</a>
              </div>
            )}
            {f.telefone1 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 w-20 shrink-0">Telefone</span>
                <a href={`tel:${f.telefone1}`} className="text-sm text-slate-700">{f.telefone1}</a>
              </div>
            )}
            {f.telefone2 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 w-20 shrink-0">Tel. 2</span>
                <a href={`tel:${f.telefone2}`} className="text-sm text-slate-700">{f.telefone2}</a>
              </div>
            )}
            {f.logradouro && (
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-slate-400 w-20 shrink-0 mt-0.5">Endereço</span>
                <div className="text-sm text-slate-700 leading-relaxed">
                  {f.logradouro}{f.numero ? `, ${f.numero}` : ''}{f.complemento ? ` — ${f.complemento}` : ''}
                  <br />{f.bairro && `${f.bairro} · `}{f.municipio_cnpj}/{f.uf_cnpj}
                  {f.cep && <><br /><span className="font-mono text-xs text-slate-400">CEP {f.cep}</span></>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Atividade */}
        <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-5 py-3">
            <h2 className="font-semibold text-white text-sm">Atividade (CNAE)</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {ativPrincipal && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">Principal</div>
                <div className="text-sm text-slate-800">
                  <span className="font-mono text-xs text-blue-700 mr-2">{ativPrincipal.codigo}</span>
                  {ativPrincipal.descricao}
                </div>
              </div>
            )}
            {cnaes.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">Secundárias</div>
                <div className="space-y-1">
                  {cnaes.slice(0, 5).map((c) => (
                    <div key={c.codigo} className="text-xs text-slate-600">
                      <span className="font-mono text-blue-700 mr-2">{c.codigo}</span>{c.descricao}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">Categorias em licitações</div>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(f.categorias) ? f.categorias as string[] : []).map((c) => (
                  <span key={c} className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 ring-1 ring-blue-100">
                    {CAT_LABEL[c] ?? c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">UFs de atuação</div>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(f.ufs_atuacao) ? f.ufs_atuacao as string[] : []).map((u) => (
                  <span key={u} className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{u}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sócios */}
      {socios.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-5 py-3">
            <h2 className="font-semibold text-white text-sm">Quadro societário</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {socios.map((s, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">{s.nome}</div>
                  {s.nomeRepresentante && (
                    <div className="text-xs text-slate-400 mt-0.5">Repr.: {s.nomeRepresentante}</div>
                  )}
                </div>
                {s.qualificacao && (
                  <span className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">{s.qualificacao}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de vitórias */}
      {resultados && resultados.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-5 py-3 flex items-center gap-3">
            <h2 className="font-semibold text-white text-sm">Histórico de homologações</h2>
            <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs font-semibold text-blue-100">{resultados.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700 border-b border-blue-100">
                <tr>
                  <th className="px-5 py-3 text-left">Órgão</th>
                  <th className="px-5 py-3 text-left">UF</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3 text-right">Desconto</th>
                  <th className="px-5 py-3 text-left">Data</th>
                  <th className="px-5 py-3 text-center">Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resultados.map((r, i) => {
                  const lic = Array.isArray(r.licitacoes) ? r.licitacoes[0] : r.licitacoes
                  const ncp = lic?.numero_controle_pncp ?? ''
                  const m = ncp.match(/^(\d+)-\d+-(\d+)\/(\d{4})$/)
                  const urlPNCP = m?.[1] && m[2] && m[3] ? `https://pncp.gov.br/app/editais/${m[1]}/${m[3]}/${parseInt(m[2], 10)}` : null
                  return (
                    <tr key={i} className="hover:bg-blue-50/40">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800 line-clamp-1">{lic?.orgao_razao_social ?? '—'}</div>
                        <div className="text-xs text-slate-400">{lic?.municipio}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700">{lic?.uf ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-blue-900">{fmt(r.valor_total_homologado)}</td>
                      <td className="px-5 py-3 text-right text-xs text-green-700">
                        {r.percentual_desconto ? `−${Number(r.percentual_desconto).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {r.data_resultado ? format(new Date(r.data_resultado), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {urlPNCP && (
                          <a href={urlPNCP} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100">
                            ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-sm ${destaque ? 'font-bold text-blue-900 text-base' : 'text-slate-700'}`}>{value}</div>
    </div>
  )
}
