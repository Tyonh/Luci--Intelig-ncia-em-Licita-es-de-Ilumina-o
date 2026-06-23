import type {
  CategoriaIluminacao,
  FocoLicitacao,
  ItemClassificado,
  ItemPNCP,
  LicitacaoClassificada,
  LicitacaoPNCP,
  ResultadoClassificado,
  ResultadoItem,
} from '@/types/pncp'

// ⚠️ Códigos CATMAT a validar na fonte oficial antes de usar como critério primário
const CATMAT_POR_CATEGORIA: Record<CategoriaIluminacao, string[]> = {
  LUMINARIA_LED: [],
  REFLETOR: [],
  POSTE: [],
  CONTROLADOR: [],
  CABO_ELETRICO: [],
  SERVICO_INSTALACAO: [],
  OUTROS_ELETRICOS: [],
}

// Termos que indicam produto claramente fora do escopo — veto final mesmo com keyword match
// Cobre medical, lab, vehicle, furniture e outros que acidentalmente mencionam "LED" ou "luminária"
const VETO_FINAL = [
  // médico / hospitalar
  'laringoscopio', 'laringoscópio', 'otoscopio', 'oftalmoscopio', 'endoscopio',
  'bisturi', 'estetoscopio', 'desfibrilador', 'oximetro', 'nebulizador',
  'equipamento medico', 'equipamento hospitalar', 'material hospitalar',
  'fibra optica medica', 'fibra optica cirurgica',
  'lampada para laringoscopio', 'lamina de laringoscopio',
  // laboratorial
  'microscopio', 'centrifuga', 'autoclave', 'espectrofotometro',
  // veículo
  'minibus', 'mini bus', 'onibus', 'micro onibus', 'ambulancia',
  'caminhao', 'veiculo automotor', 'automovel',
  // outros
  'ar condicionado', 'climatizador', 'geladeira', 'freezer',
]

// Contextos que confirmam iluminação pública/viária — necessários para keywords fracas
// Intencionalmente compostos para não bater em "saúde pública", "serviço público" etc.
const CONTEXTO_IP = [
  'iluminacao publica', 'iluminacao viaria', 'iluminacao urbana',
  'via publica', 'vias publicas', 'logradouro publico', 'logradouros publicos',
  'iluminacao de rua', 'iluminacao externa', 'iluminacao de via',
]

// Keywords que só são válidas se acompanhadas de contexto de IP
const KEYWORDS_FRACAS: Record<string, CategoriaIluminacao> = {
  'luminaria led': 'LUMINARIA_LED',
  'lampada led': 'LUMINARIA_LED',
  'lampada de led': 'LUMINARIA_LED',
  'retrofit luminaria': 'LUMINARIA_LED',
  'modulo led': 'LUMINARIA_LED',
  'refletor led': 'REFLETOR',
  'holofote led': 'REFLETOR',
  'projetor led': 'REFLETOR',
  'braco de poste': 'POSTE',
  'braco para luminaria': 'POSTE',
  'driver led': 'OUTROS_ELETRICOS',
  'reator para luminaria': 'OUTROS_ELETRICOS',
}

// Keywords fortes — batem por si só, sem precisar de contexto adicional
const KEYWORDS_FORTES: Record<string, CategoriaIluminacao> = {
  'iluminacao publica': 'LUMINARIA_LED',
  'iluminacao viaria': 'LUMINARIA_LED',
  'luminaria publica': 'LUMINARIA_LED',
  'luminaria viaria': 'LUMINARIA_LED',
  'luminaria de iluminacao publica': 'LUMINARIA_LED',
  'luminaria para iluminacao publica': 'LUMINARIA_LED',
  'ponto de iluminacao publica': 'LUMINARIA_LED',
  'ponto de iluminacao viaria': 'LUMINARIA_LED',
  'retrofit de iluminacao': 'LUMINARIA_LED',
  'kit de iluminacao publica': 'LUMINARIA_LED',
  'refletor de iluminacao': 'REFLETOR',
  'refletor para iluminacao publica': 'REFLETOR',
  'poste de iluminacao': 'POSTE',
  'poste para iluminacao': 'POSTE',
  'coluna de iluminacao': 'POSTE',
  'controlador de iluminacao': 'CONTROLADOR',
  'telegestao de iluminacao': 'CONTROLADOR',
  'sistema de telegestao': 'CONTROLADOR',
  'dimmer para iluminacao': 'CONTROLADOR',
  'gerenciamento de iluminacao publica': 'CONTROLADOR',
  'instalacao de luminaria': 'SERVICO_INSTALACAO',
  'instalacao de iluminacao publica': 'SERVICO_INSTALACAO',
  'manutencao de iluminacao publica': 'SERVICO_INSTALACAO',
  'manutencao preventiva de iluminacao': 'SERVICO_INSTALACAO',
  'substituicao de luminaria': 'SERVICO_INSTALACAO',
  'troca de luminaria': 'SERVICO_INSTALACAO',
  'retrofit de luminaria': 'SERVICO_INSTALACAO',
  'servico de iluminacao publica': 'SERVICO_INSTALACAO',
  'transformador para iluminacao': 'OUTROS_ELETRICOS',
  'fonte chaveada para led': 'OUTROS_ELETRICOS',
}


// Keywords para detectar o foco principal da licitação (baseado no objetoCompra)
const FOCO_KEYWORDS: { foco: FocoLicitacao; termos: string[] }[] = [
  {
    foco: 'natalina',
    termos: [
      'natal', 'natalino', 'natalina', 'decoracao natalina', 'iluminacao natalina',
      'decoracao de natal', 'enfeite natalino', 'ornamentacao natalina',
      'arvore de natal', 'festivo', 'festiva', 'decoracao festiva',
    ],
  },
  {
    foco: 'esportiva',
    termos: [
      'quadra esportiva', 'campo de futebol', 'estadio', 'arena esportiva',
      'ginasio', 'pista de atletismo', 'complexo esportivo', 'campo sintetico',
      'iluminacao esportiva', 'iluminacao de quadra', 'iluminacao de campo',
      'campo society', 'poliesportivo',
    ],
  },
  {
    foco: 'manutencao',
    termos: [
      'manutencao de iluminacao', 'manutencao preventiva', 'manutencao corretiva',
      'conservacao de iluminacao', 'servico de manutencao', 'troca de lampada',
      'substituicao de lampada', 'retrofit de luminaria', 'retrofit de iluminacao',
      'manutencao do sistema de iluminacao', 'gestao de iluminacao publica',
    ],
  },
  {
    foco: 'predial',
    termos: [
      'fachada', 'iluminacao predial', 'iluminacao de edificio', 'iluminacao interna',
      'iluminacao de predio', 'iluminacao de escola', 'iluminacao de hospital',
      'iluminacao de repartição', 'iluminacao de secretaria', 'iluminacao de mercado',
      'iluminacao de edificacao',
    ],
  },
]

function detectarFoco(objetoCompra: string, itensDescricoes: string[]): FocoLicitacao {
  const texto = normalizar([objetoCompra, ...itensDescricoes].join(' '))
  for (const { foco, termos } of FOCO_KEYWORDS) {
    if (termos.some((t) => texto.includes(normalizar(t)))) return foco
  }
  return 'viaria'
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function temContextoIP(normalizado: string): boolean {
  return CONTEXTO_IP.some((c) => normalizado.includes(normalizar(c)))
}

function classificarTexto(texto: string): { categoria: CategoriaIluminacao; confianca: number } | null {
  const normalizado = normalizar(texto)

  // Veto final: descarta independente de qualquer keyword match
  if (VETO_FINAL.some((t) => normalizado.includes(normalizar(t)))) return null

  // CATMAT — match direto com alta confiança (quando implementado)
  for (const [categoria, codigos] of Object.entries(CATMAT_POR_CATEGORIA)) {
    if (codigos.length > 0 && codigos.some((c) => normalizado.includes(c))) {
      return { categoria: categoria as CategoriaIluminacao, confianca: 0.95 }
    }
  }

  // Keywords fortes — batem sozinhas
  for (const [kw, categoria] of Object.entries(KEYWORDS_FORTES)) {
    if (normalizado.includes(normalizar(kw))) {
      return { categoria, confianca: 0.85 }
    }
  }

  // Keywords fracas — só batem se houver contexto de iluminação pública no texto
  if (temContextoIP(normalizado)) {
    for (const [kw, categoria] of Object.entries(KEYWORDS_FRACAS)) {
      if (normalizado.includes(normalizar(kw))) {
        return { categoria, confianca: 0.65 }
      }
    }
  }

  return null
}

function mapearResultado(r: ResultadoItem): ResultadoClassificado {
  return {
    sequencialResultado: r.sequencialResultado ?? 1,
    niFornecedor: r.niFornecedor,
    nomeFornecedor: r.nomeRazaoSocialFornecedor,
    tipoPessoa: r.tipoPessoa ?? null,
    porteFornecedor: r.porteFornecedorNome ?? null,
    naturezaJuridica: r.naturezaJuridicaNome ?? null,
    valorUnitarioHomologado: r.valorUnitarioHomologado ?? null,
    valorTotalHomologado: r.valorTotalHomologado ?? null,
    quantidadeHomologada: r.quantidadeHomologada ?? null,
    percentualDesconto: r.percentualDesconto ?? null,
    ordemClassificacao: r.ordemClassificacaoSrp ?? null,
    situacaoResultado: r.situacaoCompraItemResultadoNome ?? null,
    aplicacaoBeneficioMeEpp: r.aplicacaoBeneficioMeEpp ?? false,
    dataResultado: r.dataResultado ? new Date(r.dataResultado) : null,
  }
}

function montarItemClassificado(
  item: ItemPNCP,
  categoria: CategoriaIluminacao,
  confianca: number,
  resultados: ResultadoItem[]
): ItemClassificado {
  return {
    itemRef: item.numeroItem,
    descricao: item.descricao,
    categoria,
    isElegivel: true,
    confianca,
    motivoClassificacao: 'KEYWORD_MATCH',
    materialOuServico: item.materialOuServico ?? null,
    materialOuServicoNome: item.materialOuServicoNome ?? null,
    unidadeMedida: item.unidadeMedida ?? null,
    quantidade: item.quantidade ?? null,
    valorUnitarioEstimado: item.valorUnitarioEstimado ?? null,
    valorTotalEstimado: item.valorTotal ?? null,
    catalogoCodigoItem: item.catalogoCodigoItem ?? null,
    ncmCodigo: item.ncmNbsCodigo ?? null,
    ncmDescricao: item.ncmNbsDescricao ?? null,
    criterioJulgamento: item.criterioJulgamentoNome ?? null,
    situacaoItem: item.situacaoCompraItemNome ?? null,
    tipoBeneficio: item.tipoBeneficioNome ?? null,
    informacaoComplementar: item.informacaoComplementar ?? null,
    temResultado: item.temResultado ?? false,
    resultados: resultados.map(mapearResultado),
  }
}

// Identifica quais itens são elegíveis (de iluminação), sem buscar resultados ainda
export function identificarItensElegiveis(
  itens: ItemPNCP[]
): { item: ItemPNCP; categoria: CategoriaIluminacao; confianca: number }[] {
  const elegiveis: { item: ItemPNCP; categoria: CategoriaIluminacao; confianca: number }[] = []

  for (const item of itens) {
    const textoItem = [item.descricao ?? '', item.nomeItemCatalogo ?? ''].filter(Boolean).join(' ')
    const classificacao = classificarTexto(textoItem)
    if (!classificacao) continue
    elegiveis.push({ item, categoria: classificacao.categoria, confianca: classificacao.confianca })
  }

  return elegiveis
}

// Monta a licitação classificada completa, com itens elegíveis + seus resultados
export function montarLicitacaoClassificada(
  licitacao: LicitacaoPNCP,
  itensElegiveis: { item: ItemPNCP; categoria: CategoriaIluminacao; confianca: number; resultados: ResultadoItem[] }[],
  hashConteudo: string
): LicitacaoClassificada {
  const itens = itensElegiveis.map((e) =>
    montarItemClassificado(e.item, e.categoria, e.confianca, e.resultados)
  )

  const elegivel = itens.length > 0
  const confiancaMedia = elegivel
    ? itens.reduce((acc, i) => acc + i.confianca, 0) / itens.length
    : 0
  const possuiResultado = itens.some((i) => i.resultados.length > 0)
  const foco = detectarFoco(licitacao.objetoCompra ?? '', itens.map((i) => i.descricao))

  const codigoIbge = licitacao.unidadeOrgao.codigoIbge
  const valorHomologadoTotal = itens.reduce(
    (acc, i) => acc + i.resultados.reduce((s, r) => s + (r.valorTotalHomologado ?? 0), 0),
    0
  )

  return {
    id: licitacao.numeroControlePNCP,
    numeroControlePNCP: licitacao.numeroControlePNCP,
    orgaoCnpj: licitacao.orgaoEntidade.cnpj,
    orgaoRazaoSocial: licitacao.orgaoEntidade.razaoSocial,
    municipio: licitacao.unidadeOrgao.municipioNome,
    uf: licitacao.unidadeOrgao.ufSigla,
    codigoIbge: codigoIbge != null ? String(codigoIbge) : null,
    poderId: licitacao.orgaoEntidade.poderId ?? null,
    esferaId: licitacao.orgaoEntidade.esferaId ?? null,
    modalidadeNome: licitacao.modalidadeNome ?? '',
    modalidadeId: licitacao.modalidadeId ?? null,
    anoCompra: licitacao.anoCompra ?? null,
    sequencialCompra: licitacao.sequencialCompra ?? null,
    situacaoCompraNome: licitacao.situacaoCompraNome ?? '',
    objetoCompra: licitacao.objetoCompra ?? '',
    informacaoComplementar: licitacao.informacaoComplementar ?? null,
    srp: licitacao.srp ?? false,
    dataPublicacao: new Date(licitacao.dataPublicacaoPncp ?? licitacao.dataAtualizacaoGlobal ?? Date.now()),
    dataAberturaProposta: licitacao.dataAberturaProposta ? new Date(licitacao.dataAberturaProposta) : null,
    dataEncerramento: licitacao.dataEncerramentoProposta ? new Date(licitacao.dataEncerramentoProposta) : null,
    valorTotalEstimado: licitacao.valorTotalEstimado ?? null,
    valorTotalHomologado: valorHomologadoTotal > 0 ? valorHomologadoTotal : (licitacao.valorTotalHomologado ?? null),
    elegivel,
    confiancaMedia,
    possuiResultado,
    foco,
    itensElegiveis: itens,
    coletadaEm: new Date(),
    hashConteudo,
  }
}

export function precisaRevisaoManual(licitacao: LicitacaoClassificada): boolean {
  return licitacao.elegivel && licitacao.confiancaMedia < 0.6
}
