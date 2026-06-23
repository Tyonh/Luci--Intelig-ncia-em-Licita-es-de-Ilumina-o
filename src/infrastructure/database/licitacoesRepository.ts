import { supabaseAdmin } from './supabase'
import type { Database } from './database.types'
import type { LicitacaoClassificada, ItemClassificado } from '@/types/pncp'

type LicitacaoInsert = Database['public']['Tables']['licitacoes']['Insert']
type ItemInsert = Database['public']['Tables']['itens_licitacao']['Insert']
type ResultadoInsert = Database['public']['Tables']['resultados_item']['Insert']
type LogInsert = Database['public']['Tables']['logs_coleta']['Insert']
type FornecedorRow = Database['public']['Tables']['fornecedores']['Row']
type FornecedorInsert = Database['public']['Tables']['fornecedores']['Insert']

export async function upsertLicitacao(licitacao: LicitacaoClassificada): Promise<void> {
  const row: LicitacaoInsert = {
    numero_controle_pncp: licitacao.numeroControlePNCP,
    hash_conteudo: licitacao.hashConteudo,
    orgao_cnpj: licitacao.orgaoCnpj,
    orgao_razao_social: licitacao.orgaoRazaoSocial,
    municipio: licitacao.municipio,
    uf: licitacao.uf,
    codigo_ibge: licitacao.codigoIbge,
    poder_id: licitacao.poderId,
    esfera_id: licitacao.esferaId,
    modalidade_id: licitacao.modalidadeId,
    modalidade_nome: licitacao.modalidadeNome,
    ano_compra: licitacao.anoCompra,
    sequencial_compra: licitacao.sequencialCompra,
    situacao_nome: licitacao.situacaoCompraNome,
    objeto_compra: licitacao.objetoCompra,
    informacao_complementar: licitacao.informacaoComplementar,
    srp: licitacao.srp,
    valor_total_estimado: licitacao.valorTotalEstimado,
    valor_total_homologado: licitacao.valorTotalHomologado,
    data_publicacao: licitacao.dataPublicacao.toISOString(),
    data_abertura_proposta: licitacao.dataAberturaProposta?.toISOString() ?? null,
    data_encerramento: licitacao.dataEncerramento?.toISOString() ?? null,
    data_encerramento_proposta: licitacao.dataEncerramento?.toISOString() ?? null,
    elegivel: licitacao.elegivel,
    confianca_media: licitacao.confiancaMedia,
    revisao_manual: licitacao.confiancaMedia > 0 && licitacao.confiancaMedia < 0.6,
    possui_resultado: licitacao.possuiResultado,
    atualizada_em: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from('licitacoes')
    .upsert(row, { onConflict: 'numero_controle_pncp' })

  if (error) {
    throw new Error(`Erro ao persistir licitação ${licitacao.numeroControlePNCP}: ${error.message}`)
  }

  if (licitacao.itensElegiveis.length === 0) return

  const { data: salva, error: selectError } = await supabaseAdmin
    .from('licitacoes')
    .select('id')
    .eq('numero_controle_pncp', licitacao.numeroControlePNCP)
    .single()

  if (selectError || !salva) return
  const licitacaoId = salva.id

  // Persiste itens
  const itens: ItemInsert[] = licitacao.itensElegiveis.map((item) => ({
    licitacao_id: licitacaoId,
    numero_item: item.itemRef,
    descricao: item.descricao,
    codigo_material: item.catalogoCodigoItem,
    material_ou_servico: item.materialOuServico,
    material_ou_servico_nome: item.materialOuServicoNome,
    unidade_medida: item.unidadeMedida,
    quantidade_total: item.quantidade,
    valor_unitario_estimado: item.valorUnitarioEstimado,
    valor_total_estimado: item.valorTotalEstimado,
    ncm_codigo: item.ncmCodigo,
    ncm_descricao: item.ncmDescricao,
    criterio_julgamento: item.criterioJulgamento,
    situacao_item: item.situacaoItem,
    tipo_beneficio: item.tipoBeneficio,
    tem_resultado: item.temResultado,
    informacao_complementar: item.informacaoComplementar,
    categoria: item.categoria,
    is_elegivel: item.isElegivel,
    confianca: item.confianca,
    motivo_classificacao: item.motivoClassificacao,
  }))

  const { error: itensError } = await supabaseAdmin
    .from('itens_licitacao')
    .upsert(itens, { onConflict: 'licitacao_id,numero_item' })

  if (itensError) {
    throw new Error(`Erro ao persistir itens da licitação ${licitacao.numeroControlePNCP}: ${itensError.message}`)
  }

  // Persiste resultados (vencedores) e atualiza perfis de fornecedores
  await persistirResultados(licitacaoId, licitacao)
}

async function persistirResultados(licitacaoId: string, licitacao: LicitacaoClassificada): Promise<void> {
  const itensComResultado = licitacao.itensElegiveis.filter((i) => i.resultados.length > 0)
  if (itensComResultado.length === 0) return

  // Mapeia numero_item -> item_id (necessário para FK dos resultados)
  const { data: itensSalvos } = await supabaseAdmin
    .from('itens_licitacao')
    .select('id, numero_item')
    .eq('licitacao_id', licitacaoId)

  const mapaItemId: Record<number, string> = {}
  for (const it of itensSalvos ?? []) {
    mapaItemId[it.numero_item] = it.id
  }

  const resultados: ResultadoInsert[] = []
  for (const item of itensComResultado) {
    const itemId = mapaItemId[item.itemRef]
    if (!itemId) continue

    for (const r of item.resultados) {
      resultados.push({
        item_id: itemId,
        licitacao_id: licitacaoId,
        numero_item: item.itemRef,
        sequencial_resultado: r.sequencialResultado,
        ni_fornecedor: r.niFornecedor,
        nome_fornecedor: r.nomeFornecedor,
        tipo_pessoa: r.tipoPessoa,
        porte_fornecedor: r.porteFornecedor,
        natureza_juridica: r.naturezaJuridica,
        valor_unitario_homologado: r.valorUnitarioHomologado,
        valor_total_homologado: r.valorTotalHomologado,
        quantidade_homologada: r.quantidadeHomologada,
        percentual_desconto: r.percentualDesconto,
        ordem_classificacao: r.ordemClassificacao,
        situacao_resultado: r.situacaoResultado,
        aplicacao_beneficio_me_epp: r.aplicacaoBeneficioMeEpp,
        data_resultado: r.dataResultado?.toISOString() ?? null,
      })
    }
  }

  if (resultados.length === 0) return

  const { error } = await supabaseAdmin
    .from('resultados_item')
    .upsert(resultados, { onConflict: 'item_id,sequencial_resultado' })

  if (error) {
    throw new Error(`Erro ao persistir resultados ${licitacao.numeroControlePNCP}: ${error.message}`)
  }

  // Atualiza perfil agregado de cada fornecedor vencedor
  await atualizarFornecedores(licitacao)
}

async function atualizarFornecedores(licitacao: LicitacaoClassificada): Promise<void> {
  // Agrupa resultados por fornecedor dentro desta licitação
  const porFornecedor = new Map<
    string,
    { nome: string; tipoPessoa: string | null; porte: string | null; valor: number; categorias: Set<string> }
  >()

  for (const item of licitacao.itensElegiveis) {
    for (const r of item.resultados) {
      const atual = porFornecedor.get(r.niFornecedor) ?? {
        nome: r.nomeFornecedor,
        tipoPessoa: r.tipoPessoa,
        porte: r.porteFornecedor,
        valor: 0,
        categorias: new Set<string>(),
      }
      atual.valor += r.valorTotalHomologado ?? 0
      atual.categorias.add(item.categoria)
      porFornecedor.set(r.niFornecedor, atual)
    }
  }

  const dataRef = licitacao.dataPublicacao.toISOString()

  for (const [ni, dados] of porFornecedor) {
    // Lê perfil existente para acumular
    const { data: existente } = await supabaseAdmin
      .from('fornecedores')
      .select('*')
      .eq('ni', ni)
      .maybeSingle<FornecedorRow>()

    const categoriasAntigas: string[] = Array.isArray(existente?.categorias) ? (existente!.categorias as string[]) : []
    const ufsAntigas: string[] = Array.isArray(existente?.ufs_atuacao) ? (existente!.ufs_atuacao as string[]) : []

    const categorias = [...new Set([...categoriasAntigas, ...dados.categorias])]
    const ufs = [...new Set([...ufsAntigas, licitacao.uf])]
    const totalHomologacoes = (existente?.total_homologacoes ?? 0) + 1
    const valorTotal = Number(existente?.valor_total_homologado ?? 0) + dados.valor

    const primeira = existente?.primeira_homologacao && existente.primeira_homologacao < dataRef
      ? existente.primeira_homologacao
      : dataRef
    const ultima = existente?.ultima_homologacao && existente.ultima_homologacao > dataRef
      ? existente.ultima_homologacao
      : dataRef

    const row: FornecedorInsert = {
      ni,
      nome: dados.nome,
      tipo_pessoa: dados.tipoPessoa,
      porte: dados.porte,
      total_homologacoes: totalHomologacoes,
      valor_total_homologado: valorTotal,
      ticket_medio: totalHomologacoes > 0 ? valorTotal / totalHomologacoes : null,
      categorias,
      ufs_atuacao: ufs,
      primeira_homologacao: primeira,
      ultima_homologacao: ultima,
      atualizado_em: new Date().toISOString(),
    }

    await supabaseAdmin.from('fornecedores').upsert(row, { onConflict: 'ni' })
  }
}

export async function licitacaoJaExiste(hashConteudo: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('licitacoes')
    .select('id')
    .eq('hash_conteudo', hashConteudo)
    .maybeSingle()

  return data !== null
}

export async function registrarInicioColeta(traceId: string): Promise<string> {
  const row: LogInsert = { trace_id: traceId, status: 'em_execucao' }

  const { data, error } = await supabaseAdmin
    .from('logs_coleta')
    .insert(row)
    .select('id')
    .single()

  if (error ?? !data) {
    throw new Error(`Erro ao registrar início de coleta: ${error?.message}`)
  }

  return data.id
}

export async function registrarFimColeta(
  logId: string,
  resultado: {
    totalColetadas: number
    totalElegiveis: number
    totalDescartadas: number
    erros: string[]
    durationMs: number
    falhou: boolean
  }
): Promise<void> {
  await supabaseAdmin
    .from('logs_coleta')
    .update({
      concluido_em: new Date().toISOString(),
      duration_ms: resultado.durationMs,
      total_coletadas: resultado.totalColetadas,
      total_elegiveis: resultado.totalElegiveis,
      total_descartadas: resultado.totalDescartadas,
      erros: resultado.erros,
      status: resultado.falhou ? 'falhou' : 'concluido',
    })
    .eq('id', logId)
}

export type { ItemClassificado }
