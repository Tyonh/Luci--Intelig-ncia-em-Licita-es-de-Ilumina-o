import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/infrastructure/database/supabase'
import { consultarCNPJ, RateLimitError } from '@/infrastructure/cnpj/brasilApi'

// Cast necessário até database.types.ts ser atualizado com as colunas da migration_004
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fornecedoresTable = () => (supabaseAdmin as any).from('fornecedores')

function isAuthorized(req: Request) {
  return req.headers.get('x-cron-secret') === process.env['CRON_SECRET']
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function executarEnriquecimento() {
  // Busca fornecedores ainda não enriquecidos (pessoas jurídicas — CNPJ de 14 dígitos)
  const { data: fornecedores } = await fornecedoresTable()
    .select('ni, nome')
    .is('enriquecido_em', null)
    .filter('ni', 'like', '______________') // 14 chars = CNPJ
    .order('total_homologacoes', { ascending: false })
    .limit(100)

  if (!fornecedores?.length) {
    console.log(JSON.stringify({ event: 'enriquecimento.vazio', msg: 'Nenhum fornecedor pendente' }))
    return { enriquecidos: 0, falhas: 0 }
  }

  let enriquecidos = 0
  let falhas = 0

  for (const f of fornecedores) {
    await sleep(1500) // BrasilAPI tolera ~40 req/min — 1.5s de margem
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
      console.log(JSON.stringify({ event: 'enriquecimento.ok', ni: f.ni, nome: f.nome, email: dados.email, municipio: dados.municipio }))
    } catch (err) {
      falhas++
      if (err instanceof RateLimitError) {
        // 429 mesmo após retries — não marca como processado, será tentado na próxima execução
        console.log(JSON.stringify({ event: 'enriquecimento.rate_limit', ni: f.ni, msg: 'adiado para próxima execução' }))
        await sleep(5000) // pausa extra antes de continuar
      } else {
        // Erro real (CNPJ inválido, servidor fora) — marca como processado para não ficar em loop
        await fornecedoresTable().update({ enriquecido_em: new Date().toISOString() }).eq('ni', f.ni)
        console.log(JSON.stringify({ event: 'enriquecimento.falha', ni: f.ni, erro: String(err) }))
      }
    }
  }

  return { enriquecidos, falhas, total: fornecedores.length }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  if (process.env.JOBS_HABILITADOS === 'false') {
    return NextResponse.json({ status: 'desabilitado', motivo: 'JOBS_HABILITADOS=false' })
  }

  void executarEnriquecimento()
  return NextResponse.json({ status: 'enriquecimento iniciado' })
}
