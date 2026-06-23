import { NextResponse } from 'next/server'
import { executarEnriquecimento } from '@/infrastructure/cnpj/enriquecimentoJob'

function isAuthorized(req: Request) {
  return req.headers.get('x-cron-secret') === process.env['CRON_SECRET']
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
