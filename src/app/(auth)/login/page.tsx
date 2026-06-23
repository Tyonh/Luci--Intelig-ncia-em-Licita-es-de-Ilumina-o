import { loginAction } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const params = await searchParams
  const erro = params.erro

  const mensagemErro =
    erro === 'credenciais' ? 'E-mail ou senha incorretos.' :
    erro === 'sem_acesso' ? 'Seu perfil nao tem acesso ao sistema.' :
    null

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-blue-900 shadow-lg mb-4">
            <span className="text-xl font-bold text-blue-300">L</span>
          </div>
          <h1 className="text-2xl font-bold text-blue-900">Luci</h1>
          <p className="text-slate-500 text-sm mt-1">Inteligência em Licitações de Iluminação</p>
        </div>

        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Entrar</h2>

          {mensagemErro && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {mensagemErro}
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com.br"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                name="senha"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-900 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors mt-2"
            >
              Entrar
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Acesso restrito a funcionários da 3G Iluminação
        </p>
      </div>
    </div>
  )
}
