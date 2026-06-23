import { NextResponse } from 'next/server'
import { executarColeta, type OpcoesColeta } from '@/infrastructure/pncp/coletaJob'

// Protege o endpoint com um token simples para não expor execução pública
function isAuthorized(request: Request): boolean {
  const token = request.headers.get('x-cron-secret')
  return token === process.env['CRON_SECRET']
}

// Valida formato yyyyMMdd
function dataValida(d: string | null): d is string {
  return !!d && /^\d{8}$/.test(d)
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const opcoes: OpcoesColeta = {}

  const dataInicial = url.searchParams.get('dataInicial')
  const dataFinal = url.searchParams.get('dataFinal')
  const uf = url.searchParams.get('uf')
  const modalidade = url.searchParams.get('modalidade')

  if (dataValida(dataInicial)) opcoes.dataInicial = dataInicial
  if (dataValida(dataFinal)) opcoes.dataFinal = dataFinal
  if (uf) opcoes.ufs = uf.split(',').map((u) => u.trim().toUpperCase())
  if (modalidade) opcoes.modalidades = modalidade.split(',').map((m) => Number(m.trim())).filter((n) => !Number.isNaN(n))

  try {
    void executarColeta(opcoes)
    return NextResponse.json({
      status: 'job iniciado',
      periodo: {
        dataInicial: opcoes.dataInicial ?? '(ontem)',
        dataFinal: opcoes.dataFinal ?? '(hoje)',
      },
      ufs: opcoes.ufs ?? '(todas)',
      modalidades: opcoes.modalidades ?? '(todas)',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
