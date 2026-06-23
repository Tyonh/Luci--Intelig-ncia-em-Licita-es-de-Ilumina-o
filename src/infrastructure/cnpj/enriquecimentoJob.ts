import { supabaseAdmin } from '@/infrastructure/database/supabase'
import { consultarCNPJ, RateLimitError } from '@/infrastructure/cnpj/brasilApi'
import { gerarCNPJ, isMatriz } from '@/infrastructure/cnpj/cnpjUtils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fornecedoresTable = () => (supabaseAdmin as any).from('fornecedores')

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function log(event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'enriquecimento', event, ...extra }))
}

// Tenta buscar filiais de uma empresa matriz e insere as que não existem na base
async function descobrirFiliais(cnpjMatriz: string): Promise<number> {
  const raiz = cnpjMatriz.replace(/\D/g, '').slice(0, 8)
  let encontradas = 0
  let tentativasVazias = 0

  for (let estab = 2; estab <= 30; estab++) {
    if (tentativasVazias >= 3) break  // 3 erros consecutivos = não há mais filiais

    const cnpjFilial = gerarCNPJ(raiz, estab)

    // Já existe na base? Pula
    const { data: existe } = await fornecedoresTable()
      .select('ni')
      .eq('ni', cnpjFilial)
      .maybeSingle()

    if (existe) { tentativasVazias = 0; continue }

    await sleep(1500)
    try {
      const dados = await consultarCNPJ(cnpjFilial)

      await fornecedoresTable().upsert({
        ni: cnpjFilial,
        nome: dados.razaoSocial,
        tipo_pessoa: 'PJ',
        total_homologacoes: 0,
        valor_total_homologado: 0,
        categorias: [],
        ufs_atuacao: dados.uf ? [dados.uf] : [],
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
      }, { onConflict: 'ni', ignoreDuplicates: false })

      encontradas++
      tentativasVazias = 0
      log('enriquecimento.filial_descoberta', { cnpjMatriz, cnpjFilial, municipio: dados.municipio, uf: dados.uf })
    } catch (err) {
      if (err instanceof RateLimitError) {
        await sleep(5000)
        estab--  // tenta de novo
        continue
      }
      // 404 = filial não existe
      tentativasVazias++
    }
  }

  return encontradas
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
  let filiaisDescobertas = 0

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

      // Se for matriz, descobre filiais que ainda não estão na base
      if (isMatriz(f.ni)) {
        const novas = await descobrirFiliais(f.ni)
        filiaisDescobertas += novas
        if (novas > 0) {
          log('enriquecimento.filiais_grupo', { ni: f.ni, nome: f.nome, filiaisNovas: novas })
        }
      }
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

  log('enriquecimento.concluido', { enriquecidos, falhas, filiaisDescobertas })
  return { enriquecidos, falhas, filiaisDescobertas, total: fornecedores.length }
}
