import { supabaseAdmin } from './supabase'

export interface LicitacaoResumo {
  id: string
  numero_controle_pncp: string
  orgao_razao_social: string
  municipio: string
  uf: string
  modalidade_nome: string | null
  valor_total_estimado: number | null
  data_publicacao: string
  data_encerramento: string | null
  confianca_media: number
  revisao_manual: boolean
  total_itens: number
}

export interface StatsGerais {
  total_elegiveis: number
  total_hoje: number
  ufs_cobertas: number
  ultima_coleta: string | null
}

export async function buscarStats(): Promise<StatsGerais> {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [{ count: total }, { count: hoje_count }, ufsRes, logRes] = await Promise.all([
    supabaseAdmin.from('licitacoes').select('*', { count: 'exact', head: true }).eq('elegivel', true),
    supabaseAdmin.from('licitacoes').select('*', { count: 'exact', head: true }).eq('elegivel', true).gte('coletada_em', hoje.toISOString()),
    supabaseAdmin.from('licitacoes').select('uf').eq('elegivel', true),
    supabaseAdmin.from('logs_coleta').select('concluido_em').eq('status', 'concluido').order('concluido_em', { ascending: false }).limit(1).maybeSingle(),
  ])

  const ufs_unicas = new Set((ufsRes.data ?? []).map((r) => r.uf)).size

  return {
    total_elegiveis: total ?? 0,
    total_hoje: hoje_count ?? 0,
    ufs_cobertas: ufs_unicas,
    ultima_coleta: logRes.data?.concluido_em ?? null,
  }
}

export async function buscarLicitacoes(filtros: {
  uf?: string
  modalidade?: string
  pagina?: number
}): Promise<{ licitacoes: LicitacaoResumo[]; total: number }> {
  const pagina = filtros.pagina ?? 1
  const porPagina = 20
  const offset = (pagina - 1) * porPagina

  type LicitacaoRow = {
    id: string
    numero_controle_pncp: string
    orgao_razao_social: string
    municipio: string
    uf: string
    modalidade_nome: string | null
    valor_total_estimado: number | null
    data_publicacao: string
    data_encerramento: string | null
    confianca_media: string | number | null
    revisao_manual: boolean
  }

  let query = supabaseAdmin
    .from('licitacoes')
    .select('id, numero_controle_pncp, orgao_razao_social, municipio, uf, modalidade_nome, valor_total_estimado, data_publicacao, data_encerramento, confianca_media, revisao_manual', { count: 'exact' })
    .eq('elegivel', true)
    .order('data_publicacao', { ascending: false })
    .range(offset, offset + porPagina - 1)

  if (filtros.uf) query = query.eq('uf', filtros.uf)
  if (filtros.modalidade) query = query.ilike('modalidade_nome', `%${filtros.modalidade}%`)

  const { data, count, error } = await query
  if (error) throw new Error(`Erro ao buscar licitações: ${error.message}`)

  const rows = (data ?? []) as LicitacaoRow[]

  // Busca contagem de itens por licitação
  const ids = rows.map((r) => r.id)
  const { data: itensData } = ids.length > 0
    ? await supabaseAdmin.from('itens_licitacao').select('licitacao_id').in('licitacao_id', ids)
    : { data: [] }

  const contagemItens: Record<string, number> = {}
  for (const item of itensData ?? []) {
    contagemItens[item.licitacao_id] = (contagemItens[item.licitacao_id] ?? 0) + 1
  }

  const licitacoes: LicitacaoResumo[] = rows.map((row) => ({
    id: row.id,
    numero_controle_pncp: row.numero_controle_pncp,
    orgao_razao_social: row.orgao_razao_social,
    municipio: row.municipio,
    uf: row.uf,
    modalidade_nome: row.modalidade_nome,
    valor_total_estimado: row.valor_total_estimado,
    data_publicacao: row.data_publicacao,
    data_encerramento: row.data_encerramento,
    confianca_media: Number(row.confianca_media ?? 0),
    revisao_manual: row.revisao_manual,
    total_itens: contagemItens[row.id] ?? 0,
  }))

  return { licitacoes, total: count ?? 0 }
}

export async function buscarDetalhe(id: string) {
  const [licitacaoRes, itensRes, resultadosRes] = await Promise.all([
    supabaseAdmin.from('licitacoes').select('*').eq('id', id).single(),
    supabaseAdmin.from('itens_licitacao').select('*').eq('licitacao_id', id).order('numero_item'),
    supabaseAdmin.from('resultados_item').select('*').eq('licitacao_id', id).order('numero_item'),
  ])

  if (licitacaoRes.error || !licitacaoRes.data) return null

  // Agrupa resultados por numero_item
  const resultadosPorItem: Record<number, typeof resultadosRes.data> = {}
  for (const r of resultadosRes.data ?? []) {
    if (!resultadosPorItem[r.numero_item]) resultadosPorItem[r.numero_item] = []
    resultadosPorItem[r.numero_item]!.push(r)
  }

  return {
    licitacao: licitacaoRes.data,
    itens: itensRes.data ?? [],
    resultadosPorItem,
  }
}

export interface FornecedorResumo {
  ni: string
  nome: string
  tipo_pessoa: string | null
  porte: string | null
  total_homologacoes: number
  valor_total_homologado: number
  ticket_medio: number | null
  categorias: string[]
  ufs_atuacao: string[]
  ultima_homologacao: string | null
}

export async function buscarUFsFornecedores(): Promise<string[]> {
  const { data } = await supabaseAdmin.from('fornecedores').select('ufs_atuacao')
  const ufs = new Set<string>()
  for (const row of data ?? []) {
    if (Array.isArray(row.ufs_atuacao)) {
      for (const uf of row.ufs_atuacao as string[]) ufs.add(uf)
    }
  }
  return [...ufs].sort()
}

export async function buscarFornecedores(filtros: { porte?: string; uf?: string; minVitorias?: number; busca?: string; pagina?: number }): Promise<{ fornecedores: FornecedorResumo[]; total: number }> {
  const pagina = filtros.pagina ?? 1
  const porPagina = 25
  const offset = (pagina - 1) * porPagina

  let query = supabaseAdmin
    .from('fornecedores')
    .select('*', { count: 'exact' })
    .order('valor_total_homologado', { ascending: false })
    .range(offset, offset + porPagina - 1)

  if (filtros.busca) query = query.or(`nome.ilike.%${filtros.busca}%,ni.ilike.%${filtros.busca}%`)
  if (filtros.porte) query = query.eq('porte', filtros.porte)
  if (filtros.uf) query = query.contains('ufs_atuacao', JSON.stringify([filtros.uf]))
  if (filtros.minVitorias) query = query.gte('total_homologacoes', filtros.minVitorias)

  const { data, count, error } = await query
  if (error) throw new Error(`Erro ao buscar fornecedores: ${error.message}`)

  const fornecedores: FornecedorResumo[] = (data ?? []).map((f) => ({
    ni: f.ni,
    nome: f.nome,
    tipo_pessoa: f.tipo_pessoa,
    porte: f.porte,
    total_homologacoes: f.total_homologacoes,
    valor_total_homologado: Number(f.valor_total_homologado ?? 0),
    ticket_medio: f.ticket_medio != null ? Number(f.ticket_medio) : null,
    categorias: Array.isArray(f.categorias) ? (f.categorias as string[]) : [],
    ufs_atuacao: Array.isArray(f.ufs_atuacao) ? (f.ufs_atuacao as string[]) : [],
    ultima_homologacao: f.ultima_homologacao,
  }))

  return { fornecedores, total: count ?? 0 }
}

export interface OrgaoComprador {
  orgao_cnpj: string
  orgao_razao_social: string
  municipio: string
  uf: string
  total_licitacoes: number
  valor_total: number
  ultima_data: string
}

export async function buscarOrgaosCompradores(filtros: { uf?: string; minLicitacoes?: number; busca?: string; pagina?: number }): Promise<{ orgaos: OrgaoComprador[]; total: number }> {
  const pagina = filtros.pagina ?? 1
  const porPagina = 25
  const offset = (pagina - 1) * porPagina

  let query = supabaseAdmin
    .from('licitacoes')
    .select('orgao_cnpj, orgao_razao_social, municipio, uf, valor_total_estimado, data_publicacao', { count: 'exact' })
    .eq('elegivel', true)

  if (filtros.busca) query = query.ilike('orgao_razao_social', `%${filtros.busca}%`)
  if (filtros.uf) query = query.eq('uf', filtros.uf)

  const { data, count } = await query

  const mapa = new Map<string, OrgaoComprador>()
  for (const l of data ?? []) {
    const atual = mapa.get(l.orgao_cnpj) ?? {
      orgao_cnpj: l.orgao_cnpj,
      orgao_razao_social: l.orgao_razao_social,
      municipio: l.municipio,
      uf: l.uf,
      total_licitacoes: 0,
      valor_total: 0,
      ultima_data: l.data_publicacao,
    }
    atual.total_licitacoes += 1
    atual.valor_total += Number(l.valor_total_estimado ?? 0)
    if (l.data_publicacao > atual.ultima_data) atual.ultima_data = l.data_publicacao
    mapa.set(l.orgao_cnpj, atual)
  }

  let orgaos = [...mapa.values()].sort((a, b) => b.total_licitacoes - a.total_licitacoes)

  if (filtros.minLicitacoes) {
    orgaos = orgaos.filter((o) => o.total_licitacoes >= filtros.minLicitacoes!)
  }

  const total = orgaos.length
  const resultado = orgaos.slice(offset, offset + porPagina)

  return { orgaos: resultado, total }
}

export async function buscarUFsDisponiveis(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('licitacoes')
    .select('uf')
    .eq('elegivel', true)
    .order('uf')

  return [...new Set((data ?? []).map((r) => r.uf))]
}
