import https from 'https'

export interface DadosCNPJ {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  email: string | null
  telefone1: string | null
  telefone2: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  municipio: string | null
  uf: string | null
  cep: string | null
  situacaoCadastral: string | null   // "ATIVA" | "BAIXADA" | "SUSPENSA" etc.
  dataAbertura: string | null        // ISO date
  naturezaJuridica: string | null
  capitalSocial: number | null
  porte: string | null
  atividadePrincipal: { codigo: string; descricao: string } | null
  cnaesSecundarios: { codigo: string; descricao: string }[]
  socios: Socio[]
}

export interface Socio {
  nome: string
  qualificacao: string | null
  cpfCnpjRepresentante: string | null
  nomeRepresentante: string | null
}

class RateLimitError extends Error {
  constructor() { super('HTTP 429'); this.name = 'RateLimitError' }
}

export { RateLimitError }

function get(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15_000 }, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        if (res.statusCode === 429) { reject(new RateLimitError()); return }
        if (res.statusCode === 404) { reject(new Error('CNPJ não encontrado')); return }
        if (!res.statusCode || res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}`)); return }
        try { resolve(JSON.parse(body)) } catch { reject(new Error('JSON inválido')) }
      })
    })
      .on('error', (e) => reject(e))
      .on('timeout', function (this: import('http').ClientRequest) { this.destroy(); reject(new Error('Timeout')) })
  })
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function getComRetry(url: string, tentativa = 1): Promise<unknown> {
  try {
    return await get(url)
  } catch (err) {
    if (err instanceof RateLimitError && tentativa <= 4) {
      const espera = tentativa * 3000  // 3s, 6s, 9s, 12s
      await sleep(espera)
      return getComRetry(url, tentativa + 1)
    }
    throw err
  }
}

function fmtTel(ddd: unknown): string | null {
  if (!ddd || typeof ddd !== 'string' || ddd.trim() === '') return null
  const d = ddd.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return ddd
}

function str(v: unknown): string | null {
  if (!v || typeof v !== 'string' || v.trim() === '') return null
  return v.trim()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSocios(raw: unknown): Socio[] {
  if (!Array.isArray(raw)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((s: any) => ({
    nome: String(s.nome ?? s.nome_socio ?? ''),
    qualificacao: str(s.qualificacao_socio ?? s.qualificacao),
    cpfCnpjRepresentante: str(s.cpf_representante_legal ?? s.cnpj_cpf_do_socio),
    nomeRepresentante: str(s.nome_representante_legal),
  })).filter((s) => s.nome.length > 0)
}

export async function consultarCNPJ(cnpj: string): Promise<DadosCNPJ> {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await getComRetry(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`) as any

  const ativPrincipal = Array.isArray(data.atividade_principal) && data.atividade_principal.length > 0
    ? { codigo: String(data.atividade_principal[0].code ?? data.atividade_principal[0].codigo ?? ''), descricao: String(data.atividade_principal[0].text ?? data.atividade_principal[0].descricao ?? '') }
    : null

  const cnaesSecundarios = Array.isArray(data.cnaes_secundarios)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? data.cnaes_secundarios.map((c: any) => ({ codigo: String(c.code ?? c.codigo ?? ''), descricao: String(c.text ?? c.descricao ?? '') }))
    : []

  return {
    cnpj: cnpjLimpo,
    razaoSocial: String(data.razao_social ?? ''),
    nomeFantasia: str(data.nome_fantasia),
    email: str(data.email),
    telefone1: fmtTel(data.ddd_telefone_1),
    telefone2: fmtTel(data.ddd_telefone_2),
    logradouro: str(data.logradouro),
    numero: str(data.numero),
    complemento: str(data.complemento),
    bairro: str(data.bairro),
    municipio: str(data.municipio),
    uf: str(data.uf),
    cep: str(data.cep)?.replace(/(\d{5})(\d{3})/, '$1-$2') ?? null,
    situacaoCadastral: str(data.descricao_situacao_cadastral),
    dataAbertura: str(data.data_inicio_atividade),
    naturezaJuridica: str(data.descricao_natureza_juridica),
    capitalSocial: typeof data.capital_social === 'number' ? data.capital_social : null,
    porte: str(data.porte),
    atividadePrincipal: ativPrincipal,
    cnaesSecundarios,
    socios: parseSocios(data.qsa ?? data.socios),
  }
}
