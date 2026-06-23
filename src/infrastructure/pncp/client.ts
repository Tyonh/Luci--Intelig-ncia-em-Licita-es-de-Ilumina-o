import https from 'https'
import { z } from 'zod'
import {
  LicitacaoPNCPSchema,
  ItemPNCPSchema,
  ResultadoItemSchema,
  RespostaPNCPSchema,
  type LicitacaoPNCP,
  type ItemPNCP,
  type ResultadoItem,
  type ParamsConsultaLicitacoes,
  type ParamsPropostasAbertas,
} from '@/types/pncp'

const PNCP_BASE = 'pncp.gov.br'
const PNCP_BASE_PATH = '/api/consulta/v1'
const PNCP_INTEGRACAO_PATH = '/pncp-api/v1' // API de integração — usada para itens
const MAX_RETRIES = 4
const TIMEOUT_MS = 30_000

export class PNCPApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly path?: string
  ) {
    super(message)
    this.name = 'PNCPApiError'
  }
}

function httpsGet(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: PNCP_BASE,
      path,
      method: 'GET',
      rejectUnauthorized: false, // Certificado ICP-Brasil não reconhecido pelo Node
      headers: { 'User-Agent': 'Luci/1.0 (inteligencia-licitacoes)' },
      timeout: TIMEOUT_MS,
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        if (res.statusCode === 204) {
          // Sem resultados para os filtros informados — retorna lista vazia
          resolve({ data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: 1, empty: true })
          return
        }
        if (res.statusCode === 429) {
          reject(new PNCPApiError('Rate limit excedido', 429, path))
          return
        }
        if (res.statusCode === 404) {
          reject(new PNCPApiError(`Endpoint não encontrado`, 404, path))
          return
        }
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new PNCPApiError(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`, res.statusCode, path))
          return
        }
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new PNCPApiError(`Resposta não é JSON válido (status ${res.statusCode}, body: ${body.slice(0, 100)})`, res.statusCode, path))
        }
      })
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new PNCPApiError(`Timeout após ${TIMEOUT_MS}ms`, undefined, path))
    })

    req.on('error', (err) => {
      reject(new PNCPApiError(`Erro de rede: ${err.message}`, undefined, path))
    })

    req.end()
  })
}

async function fetchComRetry<T>(
  path: string,
  schema: z.ZodType<T>,
  tentativa = 1
): Promise<T> {
  try {
    const json = await httpsGet(path)
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      throw new PNCPApiError(`Schema inválido: ${parsed.error.message}`, undefined, path)
    }
    return parsed.data
  } catch (err) {
    if (err instanceof PNCPApiError) {
      const reintentavel = err.statusCode === 429 || err.statusCode === undefined || (err.statusCode ?? 0) >= 500
      if (reintentavel && tentativa < MAX_RETRIES) {
        // 429 precisa de espera maior — a janela de rate limit do PNCP é por minuto
        const base = err.statusCode === 429 ? 8000 : 1500
        const backoff = Math.pow(2, tentativa - 1) * base
        await new Promise((r) => setTimeout(r, backoff))
        return fetchComRetry(path, schema, tentativa + 1)
      }
      throw err
    }
    throw new PNCPApiError(`Erro inesperado: ${String(err)}`, undefined, path)
  }
}

export async function buscarLicitacoesPorPeriodo(
  params: ParamsConsultaLicitacoes
): Promise<{ licitacoes: LicitacaoPNCP[]; totalPaginas: number; totalRegistros: number }> {
  const query = new URLSearchParams({
    dataInicial: params.dataInicial,
    dataFinal: params.dataFinal,
    codigoModalidadeContratacao: String(params.codigoModalidadeContratacao),
    pagina: String(params.pagina),
    tamanhoPagina: String(params.tamanhoPagina),
    ...(params.uf ? { uf: params.uf } : {}),
  })

  const path = `${PNCP_BASE_PATH}/contratacoes/publicacao?${query.toString()}`
  const resposta = await fetchComRetry(path, RespostaPNCPSchema)

  return {
    licitacoes: resposta.data,
    totalPaginas: resposta.totalPaginas ?? 1,
    totalRegistros: resposta.totalRegistros ?? 0,
  }
}

// Licitações com período de recebimento de propostas em aberto
// Ideal para identificar oportunidades ativas no momento
export async function buscarPropostasAbertas(
  params: ParamsPropostasAbertas
): Promise<{ licitacoes: LicitacaoPNCP[]; totalPaginas: number; totalRegistros: number }> {
  const query = new URLSearchParams({
    dataFinal: params.dataFinal,
    pagina: String(params.pagina),
    tamanhoPagina: String(params.tamanhoPagina),
    ...(params.codigoModalidadeContratacao ? { codigoModalidadeContratacao: String(params.codigoModalidadeContratacao) } : {}),
    ...(params.uf ? { uf: params.uf } : {}),
  })

  const path = `${PNCP_BASE_PATH}/contratacoes/proposta?${query.toString()}`
  const resposta = await fetchComRetry(path, RespostaPNCPSchema)

  return {
    licitacoes: resposta.data,
    totalPaginas: resposta.totalPaginas ?? 1,
    totalRegistros: resposta.totalRegistros ?? 0,
  }
}

// Itens individuais de uma contratação — API de integração PNCP (/pncp-api/v1)
// A API de consulta (/api/consulta/v1) NÃO expõe itens — apenas a de integração
export async function buscarItensLicitacao(
  cnpj: string,
  anoCompra: number,
  sequencialCompra: number
): Promise<ItemPNCP[]> {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  const path = `${PNCP_INTEGRACAO_PATH}/orgaos/${cnpjLimpo}/compras/${anoCompra}/${sequencialCompra}/itens`

  const json = await httpsGet(path).catch((err) => {
    if (err instanceof PNCPApiError && err.statusCode === 204) return []
    throw err
  })

  if (Array.isArray(json)) {
    const parsed = ItemPNCPSchema.array().safeParse(json)
    return parsed.success ? parsed.data : []
  }

  const paginado = z.object({ data: ItemPNCPSchema.array() }).safeParse(json)
  return paginado.success ? paginado.data.data : []
}

// Resultados (vencedores) de um item específico — API de integração
export async function buscarResultadosItem(
  cnpj: string,
  anoCompra: number,
  sequencialCompra: number,
  numeroItem: number
): Promise<ResultadoItem[]> {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  const path = `${PNCP_INTEGRACAO_PATH}/orgaos/${cnpjLimpo}/compras/${anoCompra}/${sequencialCompra}/itens/${numeroItem}/resultados`

  const json = await httpsGet(path).catch((err) => {
    if (err instanceof PNCPApiError && (err.statusCode === 204 || err.statusCode === 404)) return []
    throw err
  })

  if (Array.isArray(json)) {
    const parsed = ResultadoItemSchema.array().safeParse(json)
    return parsed.success ? parsed.data : []
  }

  const paginado = z.object({ data: ResultadoItemSchema.array() }).safeParse(json)
  return paginado.success ? paginado.data.data : []
}

export async function buscarLicitacaoPorControle(
  numeroControlePNCP: string
): Promise<LicitacaoPNCP> {
  const path = `${PNCP_BASE_PATH}/contratacoes/${encodeURIComponent(numeroControlePNCP)}`
  return fetchComRetry(path, LicitacaoPNCPSchema)
}

export interface DocumentoPNCP {
  sequencialDocumento: number
  titulo: string | null
  url: string | null
  tipoDocumentoNome: string | null
}

const DocumentoPNCPSchema = z.object({
  sequencialDocumento: z.number().int(),
  titulo: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  tipoDocumentoNome: z.string().nullable().optional(),
}).passthrough().transform((d) => ({
  sequencialDocumento: d.sequencialDocumento,
  titulo: d.titulo ?? null,
  url: d.url ?? null,
  tipoDocumentoNome: d.tipoDocumentoNome ?? null,
}))

export async function buscarDocumentosLicitacao(
  cnpj: string,
  anoCompra: number,
  sequencialCompra: number
): Promise<DocumentoPNCP[]> {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  const path = `${PNCP_INTEGRACAO_PATH}/orgaos/${cnpjLimpo}/compras/${anoCompra}/${sequencialCompra}/arquivos`

  const json = await httpsGet(path).catch((err) => {
    if (err instanceof PNCPApiError && (err.statusCode === 204 || err.statusCode === 404)) return []
    throw err
  })

  if (Array.isArray(json)) {
    const parsed = DocumentoPNCPSchema.array().safeParse(json)
    return parsed.success ? parsed.data : []
  }

  const paginado = z.object({ data: DocumentoPNCPSchema.array() }).safeParse(json)
  return paginado.success ? paginado.data.data : []
}

// Baixa um arquivo remoto como Buffer — suporta URLs externas (não só PNCP)
export function downloadArquivo(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http')
    const req = mod.get(url, { rejectUnauthorized: false, timeout: 60_000 }, (res: import('http').IncomingMessage) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadArquivo(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new PNCPApiError(`Download falhou: HTTP ${res.statusCode}`, res.statusCode, url))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('error', (err: Error) => reject(new PNCPApiError(`Erro download: ${err.message}`, undefined, url)))
    req.on('timeout', () => { req.destroy(); reject(new PNCPApiError('Timeout no download', undefined, url)) })
  })
}
