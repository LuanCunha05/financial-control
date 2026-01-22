export interface Categoria {
  id: string
  nome: string
  tipo: 'Receita' | 'Despesa'
  descricao?: string
}

export interface Conta {
  id: string
  nome: string
  tipo: 'Conta Corrente' | 'Conta Poupança' | 'Cartão de Crédito' | 'Dinheiro' | 'Carteira Digital' | 'Investimento'
  instituicao: string
  saldoInicial: number
}

export interface Lancamento {
  id: string
  data: string
  descricao: string
  categoriaId: string
  contaId: string
  valor: number
  tipo: 'Receita' | 'Despesa'
  mes: number
  ano: number
  observacoes?: string
  comprovanteUrl?: string
  comprovanteTextoOCR?: string
}

export interface ResumoMensal {
  mes: number
  ano: number
  totalReceitas: number
  totalDespesas: number
  saldo: number
}

export interface DashboardData {
  resumoAnual: {
    totalReceitas: number
    totalDespesas: number
    saldo: number
    mediaReceitas: number
    mediaDespesas: number
  }
  comparativoMensal: ResumoMensal[]
  topCategorias: {
    categoria: Categoria
    total: number
    percentual: number
  }[]
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
] as const

export type MesNome = typeof MESES[number]
