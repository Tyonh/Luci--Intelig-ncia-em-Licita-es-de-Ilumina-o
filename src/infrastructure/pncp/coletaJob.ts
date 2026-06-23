import cron from 'node-cron'
import { format, subDays } from 'date-fns'
import { buscarLicitacoesPorPeriodo, buscarItensLicitacao, buscarResultadosItem, PNCPApiError } from './client'
import { identificarItensElegiveis, montarLicitacaoClassificada } from '@/domain/licitacao/classificador'
import { UFS_ALVO, MODALIDADES_ALVO, type ResultadoItem } from '@/types/pncp'
import {
  licitacaoJaExiste,
  upsertLicitacao,
  registrarInicioColeta,
  registrarFimColeta,
} from '@/infrastructure/database/licitacoesRepository'
import { createHash } from 'crypto'

const TAMANHO_PAGINA = 50
const DELAY_ENTRE_REQUESTS_MS = Number(process.env.COLETA_DELAY_MS ?? 2000)

function log(level: 'info' | 'warn' | 'error', event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service: 'coleta', event, ...extra }))
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function gerarTraceId(): string {
  return `coleta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function gerarHash(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex')
}

export interface OpcoesColeta {
  dataInicial?: string       // formato yyyyMMdd — padrão: ontem
  dataFinal?: string         // formato yyyyMMdd — padrão: hoje
  ufs?: readonly string[]    // padrão: todas as UFs alvo
  modalidades?: readonly number[] // padrão: todas as modalidades alvo
}

export async function executarColeta(opcoes: OpcoesColeta = {}): Promise<void> {
  const traceId = gerarTraceId()
  const inicio = Date.now()
  const dataFinal = opcoes.dataFinal ?? format(new Date(), 'yyyyMMdd')
  const dataInicial = opcoes.dataInicial ?? format(subDays(new Date(), 1), 'yyyyMMdd')
  const ufsAlvo = opcoes.ufs ?? UFS_ALVO
  const modalidadesAlvo = opcoes.modalidades ?? MODALIDADES_ALVO

  let totalColetadas = 0
  let totalElegiveis = 0
  let totalDescartadas = 0
  let totalDuplicadas = 0
  const erros: string[] = []

  log('info', 'coleta.job_iniciado', { traceId, dataInicial, dataFinal, modalidades: modalidadesAlvo, ufs: ufsAlvo.length })

  const logId = await registrarInicioColeta(traceId)

  for (const modalidade of modalidadesAlvo) {
    for (const uf of ufsAlvo) {
      try {
        let pagina = 1
        let totalPaginas = 1

        while (pagina <= totalPaginas) {
          await sleep(DELAY_ENTRE_REQUESTS_MS)

          const resultado = await buscarLicitacoesPorPeriodo({
            dataInicial,
            dataFinal,
            codigoModalidadeContratacao: modalidade,
            pagina,
            tamanhoPagina: TAMANHO_PAGINA,
            uf,
          })

          totalPaginas = resultado.totalPaginas

          for (const licitacao of resultado.licitacoes) {
            const hash = gerarHash(licitacao)
            const duplicada = await licitacaoJaExiste(hash)

            if (duplicada) {
              totalDuplicadas++
              continue
            }

            totalColetadas++

            // 1. Busca itens individuais — classificação real por produto, não pelo título
            const cnpj = licitacao.orgaoEntidade.cnpj
            const ano = licitacao.anoCompra
            const seq = licitacao.sequencialCompra

            let itens: Awaited<ReturnType<typeof buscarItensLicitacao>> = []

            if (ano && seq) {
              await sleep(DELAY_ENTRE_REQUESTS_MS)
              try {
                itens = await buscarItensLicitacao(cnpj, ano, seq)
              } catch (err) {
                const msg = err instanceof PNCPApiError ? err.message : String(err)
                log('warn', 'coleta.itens_falhou', { traceId, numeroControlePNCP: licitacao.numeroControlePNCP, error: { message: msg } })
              }
            }

            // 2. Identifica itens elegíveis (de iluminação)
            const elegiveis = identificarItensElegiveis(itens)

            if (elegiveis.length === 0) {
              totalDescartadas++
              continue
            }

            // 3. Só prossegue se ao menos um item já tem resultado — garante licitação homologada
            const algumTemResultado = elegiveis.some((e) => e.item.temResultado)
            if (!algumTemResultado) {
              totalDescartadas++
              log('info', 'coleta.sem_resultado', { traceId, numeroControlePNCP: licitacao.numeroControlePNCP, motivo: 'nenhum item homologado' })
              continue
            }

            // 4. Busca resultado de cada item elegível que já foi homologado
            const itensComResultados = []
            for (const e of elegiveis) {
              let resultados: ResultadoItem[] = []
              if (ano && seq && e.item.temResultado) {
                await sleep(DELAY_ENTRE_REQUESTS_MS)
                try {
                  resultados = await buscarResultadosItem(cnpj, ano, seq, e.item.numeroItem)
                } catch (err) {
                  const msg = err instanceof PNCPApiError ? err.message : String(err)
                  log('warn', 'coleta.resultado_falhou', { traceId, numeroControlePNCP: licitacao.numeroControlePNCP, numeroItem: e.item.numeroItem, error: { message: msg } })
                }
              }
              itensComResultados.push({ ...e, resultados })
            }

            // Descarta se nenhum resultado voltou (API sem dados ainda)
            const totalVencedores = itensComResultados.reduce((acc, i) => acc + i.resultados.length, 0)
            if (totalVencedores === 0) {
              totalDescartadas++
              log('info', 'coleta.sem_resultado', { traceId, numeroControlePNCP: licitacao.numeroControlePNCP, motivo: 'API retornou resultados vazios' })
              continue
            }

            // 5. Monta e persiste a licitação completa (só homologadas com vencedor)
            const classificada = montarLicitacaoClassificada(licitacao, itensComResultados, hash)
            totalElegiveis++
            await upsertLicitacao(classificada)

            log('info', 'coleta.licitacao_elegivel', {
              traceId,
              numeroControlePNCP: licitacao.numeroControlePNCP,
              uf,
              confianca: classificada.confiancaMedia,
              itensElegiveis: classificada.itensElegiveis.length,
              vencedores: totalVencedores,
              primeiroItem: classificada.itensElegiveis[0]?.descricao?.slice(0, 70),
            })

          }

          if (resultado.licitacoes.length > 0) {
            log('info', 'coleta.pagina_processada', { traceId, modalidade, uf, pagina, totalPaginas, itensNaPagina: resultado.licitacoes.length })
          }
          pagina++
        }
      } catch (err) {
        const mensagem = err instanceof PNCPApiError ? err.message : String(err)
        erros.push(`modalidade=${modalidade} uf=${uf}: ${mensagem}`)
        log('error', 'coleta.api_falhou', { traceId, modalidade, uf, error: { message: mensagem } })
      }
    }
  }

  const durationMs = Date.now() - inicio
  await registrarFimColeta(logId, { totalColetadas, totalElegiveis, totalDescartadas, erros, durationMs, falhou: erros.length === modalidadesAlvo.length * ufsAlvo.length })

  log('info', 'coleta.job_concluido', { traceId, totalColetadas, totalElegiveis, totalDescartadas, totalDuplicadas, erros: erros.length, durationMs })
}

export function iniciarScheduler(): void {
  if (process.env.JOBS_HABILITADOS === 'false') {
    log('info', 'coleta.scheduler_desabilitado', { motivo: 'JOBS_HABILITADOS=false' })
    return
  }
  cron.schedule('0 3 * * *', () => { void executarColeta() }, { timezone: 'America/Sao_Paulo' })
  log('info', 'coleta.scheduler_iniciado', { schedule: '03:00 BRT diário' })
}
