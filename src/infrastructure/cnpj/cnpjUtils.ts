// Calcula os dígitos verificadores de um CNPJ dado os 12 primeiros dígitos
function calcularDigitos(base: string): string {
  const d = base.split('').map(Number)

  const peso1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const soma1 = d.reduce((acc, n, i) => acc + n * peso1[i]!, 0)
  const r1 = soma1 % 11
  const d1 = r1 < 2 ? 0 : 11 - r1

  const peso2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d2digits = [...d, d1]
  const soma2 = d2digits.reduce((acc, n, i) => acc + n * peso2[i]!, 0)
  const r2 = soma2 % 11
  const d2 = r2 < 2 ? 0 : 11 - r2

  return `${d1}${d2}`
}

// Gera um CNPJ válido a partir do raiz (8 dígitos) e número do estabelecimento (4 dígitos)
export function gerarCNPJ(raiz: string, estabelecimento: number): string {
  const estab = String(estabelecimento).padStart(4, '0')
  const base = `${raiz}${estab}`
  const digitos = calcularDigitos(base)
  return `${base}${digitos}`
}

// Retorna true se o CNPJ é matriz (estabelecimento 0001)
export function isMatriz(cnpj: string): boolean {
  return cnpj.replace(/\D/g, '').slice(8, 12) === '0001'
}
