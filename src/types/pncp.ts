import { z } from 'zod'

// ─── Constantes de Domínio ────────────────────────────────────────────────────

export const REGIOES_ALVO = {
  NORTE: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
  NORDESTE: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
} as const

export type UF = (typeof REGIOES_ALVO)[keyof typeof REGIOES_ALVO][number]

export const UFS_ALVO: readonly string[] = [
  ...REGIOES_ALVO.NORTE,
  ...REGIOES_ALVO.NORDESTE,
]

// Modalidades de contratação (fonte: Manual PNCP API v1.0, seção 5.2)
export const TODAS_MODALIDADES = {
  1: 'Leilão - Eletrônico',
  2: 'Diálogo Competitivo',
  3: 'Concurso',
  4: 'Concorrência - Eletrônica',
  5: 'Concorrência - Presencial',
  6: 'Pregão - Eletrônico',
  7: 'Pregão - Presencial',
  8: 'Dispensa de Licitação',
  9: 'Inexigibilidade',
  10: 'Manifestação de Interesse',
  11: 'Pré-qualificação',
  12: 'Credenciamento',
  13: 'Leilão - Presencial',
} as const

// Modalidades relevantes para compras de materiais/serviços de iluminação
export const MODALIDADES_ALVO = [4, 5, 6, 7, 8, 9] as const
export type CodigoModalidade = (typeof MODALIDADES_ALVO)[number]

// ─── Schemas Zod ─────────────────────────────────────────────────────────────

// Helpers: a API do PNCP retorna null em campos sem valor (não apenas omite)
const strOpt = () => z.string().nullable().optional()
const numOpt = () => z.number().nullable().optional()

export const OrgaoEntidadeSchema = z.object({
  cnpj: z.string(),
  razaoSocial: z.string(),
  poderId: strOpt(),
  esferaId: strOpt(),
})

export const UnidadeOrgaoSchema = z.object({
  ufSigla: z.string().length(2),
  ufNome: strOpt(),
  municipioNome: z.string(),
  codigoUnidade: strOpt(),
  nomeUnidade: strOpt(),
  codigoIbge: z.union([z.string(), z.number()]).nullable().optional(),
})

export const LicitacaoPNCPSchema = z.object({
  numeroControlePNCP: z.string(),
  orgaoEntidade: OrgaoEntidadeSchema,
  unidadeOrgao: UnidadeOrgaoSchema,
  anoCompra: numOpt(),
  sequencialCompra: numOpt(),
  modalidadeId: numOpt(),
  modalidadeNome: strOpt(),
  situacaoCompraId: numOpt(),
  situacaoCompraNome: strOpt(),
  objetoCompra: strOpt(),
  informacaoComplementar: strOpt(),
  dataPublicacaoPncp: strOpt(),
  dataAtualizacaoGlobal: strOpt(),
  dataAberturaProposta: strOpt(),
  dataEncerramentoProposta: strOpt(),
  valorTotalEstimado: numOpt(),
  valorTotalHomologado: numOpt(),
  linkSistemaOrigem: strOpt(),
  srp: z.boolean().nullable().optional(),
})

export const RespostaPNCPSchema = z.object({
  data: z.array(LicitacaoPNCPSchema),
  totalRegistros: z.number().int().optional(),
  totalPaginas: z.number().int().optional(),
  numeroPagina: z.number().int().optional(),
  empty: z.boolean().optional(),
})

export const ItemPNCPSchema = z.object({
  numeroItem: z.number().int(),
  descricao: z.string(),
  materialOuServico: strOpt(),        // 'M' material | 'S' serviço
  materialOuServicoNome: strOpt(),
  unidadeMedida: strOpt(),
  quantidade: numOpt(),
  valorUnitarioEstimado: numOpt(),
  valorTotal: numOpt(),
  orcamentoSigiloso: z.boolean().nullable().optional(),
  catalogoCodigoItem: strOpt(),       // código CATMAT/CATSER
  nomeItemCatalogo: strOpt(),
  itemCategoriaNome: strOpt(),
  criterioJulgamentoId: numOpt(),
  criterioJulgamentoNome: strOpt(),
  situacaoCompraItem: numOpt(),
  situacaoCompraItemNome: strOpt(),
  informacaoComplementar: strOpt(),
  ncmNbsCodigo: strOpt(),
  ncmNbsDescricao: strOpt(),
  tipoBeneficioNome: strOpt(),
  temResultado: z.boolean().nullable().optional(),
}).passthrough() // ignora campos extras sem falhar

// Resultado homologado de um item — o vencedor da licitação
export const ResultadoItemSchema = z.object({
  numeroItem: z.number().int(),
  sequencialResultado: numOpt(),
  niFornecedor: z.string(),
  nomeRazaoSocialFornecedor: z.string(),
  tipoPessoa: strOpt(),                // PJ | PF | PE
  porteFornecedorNome: strOpt(),       // ME | EPP | Demais
  naturezaJuridicaNome: strOpt(),
  valorUnitarioHomologado: numOpt(),
  valorTotalHomologado: numOpt(),
  quantidadeHomologada: numOpt(),
  percentualDesconto: numOpt(),
  ordemClassificacaoSrp: numOpt(),
  situacaoCompraItemResultadoNome: strOpt(),
  aplicacaoBeneficioMeEpp: z.boolean().nullable().optional(),
  dataResultado: strOpt(),
}).passthrough()

// ─── Tipos derivados ──────────────────────────────────────────────────────────

export type OrgaoEntidade = z.infer<typeof OrgaoEntidadeSchema>
export type UnidadeOrgao = z.infer<typeof UnidadeOrgaoSchema>
export type LicitacaoPNCP = z.infer<typeof LicitacaoPNCPSchema>
export type RespostaPNCP = z.infer<typeof RespostaPNCPSchema>
export type ItemPNCP = z.infer<typeof ItemPNCPSchema>
export type ResultadoItem = z.infer<typeof ResultadoItemSchema>

// ─── Tipos de Domínio Interno ─────────────────────────────────────────────────

export type CategoriaIluminacao =
  | 'LUMINARIA_LED'
  | 'REFLETOR'
  | 'POSTE'
  | 'CONTROLADOR'
  | 'CABO_ELETRICO'
  | 'SERVICO_INSTALACAO'
  | 'OUTROS_ELETRICOS'

export interface ResultadoClassificado {
  sequencialResultado: number
  niFornecedor: string
  nomeFornecedor: string
  tipoPessoa: string | null
  porteFornecedor: string | null
  naturezaJuridica: string | null
  valorUnitarioHomologado: number | null
  valorTotalHomologado: number | null
  quantidadeHomologada: number | null
  percentualDesconto: number | null
  ordemClassificacao: number | null
  situacaoResultado: string | null
  aplicacaoBeneficioMeEpp: boolean
  dataResultado: Date | null
}

export interface ItemClassificado {
  itemRef: number
  descricao: string
  categoria: CategoriaIluminacao
  isElegivel: boolean
  confianca: number
  motivoClassificacao: 'CATMAT_MATCH' | 'KEYWORD_MATCH' | 'MANUAL'
  // Dados originais do item PNCP
  materialOuServico: string | null
  materialOuServicoNome: string | null
  unidadeMedida: string | null
  quantidade: number | null
  valorUnitarioEstimado: number | null
  valorTotalEstimado: number | null
  catalogoCodigoItem: string | null
  ncmCodigo: string | null
  ncmDescricao: string | null
  criterioJulgamento: string | null
  situacaoItem: string | null
  tipoBeneficio: string | null
  informacaoComplementar: string | null
  temResultado: boolean
  resultados: ResultadoClassificado[]
}

export type FocoLicitacao = 'viaria' | 'natalina' | 'esportiva' | 'manutencao' | 'predial'

export interface LicitacaoClassificada {
  id: string
  numeroControlePNCP: string
  orgaoCnpj: string
  orgaoRazaoSocial: string
  municipio: string
  uf: string
  codigoIbge: string | null
  poderId: string | null
  esferaId: string | null
  modalidadeNome: string
  modalidadeId: number | null
  anoCompra: number | null
  sequencialCompra: number | null
  situacaoCompraNome: string
  objetoCompra: string
  informacaoComplementar: string | null
  srp: boolean
  dataPublicacao: Date
  dataAberturaProposta: Date | null
  dataEncerramento: Date | null
  valorTotalEstimado: number | null
  valorTotalHomologado: number | null
  elegivel: boolean
  confiancaMedia: number
  possuiResultado: boolean
  foco: FocoLicitacao
  itensElegiveis: ItemClassificado[]
  coletadaEm: Date
  hashConteudo: string
}

export interface ParamsConsultaLicitacoes {
  dataInicial: string           // formato: yyyyMMdd (AAAAMMDD)
  dataFinal: string             // formato: yyyyMMdd (AAAAMMDD)
  codigoModalidadeContratacao: number
  pagina: number
  tamanhoPagina: number         // padrão máx: 50 no /publicacao | até 500 em outros
  uf?: string
}

export interface ParamsPropostasAbertas {
  dataFinal: string             // formato: yyyyMMdd — busca propostas abertas até esta data
  codigoModalidadeContratacao?: number
  uf?: string
  pagina: number
  tamanhoPagina: number
}
