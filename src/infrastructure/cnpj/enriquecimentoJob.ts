import { supabaseAdmin } from '@/infrastructure/database/supabase'
import { consultarCNPJ, RateLimitError } from '@/infrastructure/cnpj/brasilApi'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fornecedoresTable = () => (supabaseAdmin as any).from('fornecedores')

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function log(event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'enriquecimento', event, ...extra }))
}

export async function executarEnriquecimento() {
  const { data: fornecedores } = await fornecedoresTable()
    .select('ni, nome')
    .is('enriquecido_em', null)
    .filter('ni', 'like', '______________') // 14 chars = CNPJ
    .order('total_homologacoes', { ascending: false })
    .limit(200)

  if (!fornecedores?.length) {
    log('enriquecimento.vazio', { msg: 'Nenhum fornecedor pendente' })
    return { enriquecidos: 0, falhas: 0 }
  }

  let enriquecidos = 0
  let falhas = 0

  for (const f of fornecedores) {
    await sleep(1500)
    try {
      const dados = await consultarCNPJ(f.ni)
      await fornecedoresTable().update({
        nome_fantasia: dados.nomeFantasia,
        email: dados.email,
        telefone1: dados.telefone1,
        telefone2: dados.telefone2,
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        municipio_cnpj: dados.municipio,
        uf_cnpj: dados.uf,
        cep: dados.cep,
        situacao_cadastral: dados.situacaoCadastral,
        data_abertura: dados.dataAbertura,
        natureza_juridica: dados.naturezaJuridica,
        capital_social: dados.capitalSocial,
        atividade_principal: dados.atividadePrincipal,
        cnaes_secundarios: dados.cnaesSecundarios,
        socios: dados.socios,
        enriquecido_em: new Date().toISOString(),
      }).eq('ni', f.ni)
      enriquecidos++
      log('enriquecimento.ok', { ni: f.ni, nome: f.nome, email: dados.email, municipio: dados.municipio })
    } catch (err) {
      falhas++
      if (err instanceof RateLimitError) {
        log('enriquecimento.rate_limit', { ni: f.ni, msg: 'adiado para proxima execucao' })
        await sleep(5000)
      } else {
        await fornecedoresTable().update({ enriquecido_em: new Date().toISOString() }).eq('ni', f.ni)
        log('enriquecimento.falha', { ni: f.ni, erro: String(err) })
      }
    }
  }

  return { enriquecidos, falhas, total: fornecedores.length }
}
