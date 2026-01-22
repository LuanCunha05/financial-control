import type { Categoria, Conta, Lancamento, ResumoMensal } from '~/types'

export const useFinanceiro = () => {
  // Estados reativos
  const categorias = useState<Categoria[]>('categorias', () => [
    { id: '1', nome: 'Salário', tipo: 'Receita', descricao: 'Salário mensal' },
    { id: '2', nome: 'Freelance', tipo: 'Receita', descricao: 'Trabalhos extras' },
    { id: '3', nome: 'Investimentos', tipo: 'Receita', descricao: 'Rendimentos' },
    { id: '4', nome: 'Alimentação', tipo: 'Despesa', descricao: 'Supermercado' },
    { id: '5', nome: 'Restaurantes', tipo: 'Despesa', descricao: 'Refeições fora' },
    { id: '6', nome: 'Moradia', tipo: 'Despesa', descricao: 'Aluguel, condomínio' },
    { id: '7', nome: 'Contas Básicas', tipo: 'Despesa', descricao: 'Luz, água, internet' },
    { id: '8', nome: 'Transporte', tipo: 'Despesa', descricao: 'Combustível, transporte' },
    { id: '9', nome: 'Saúde', tipo: 'Despesa', descricao: 'Remédios, consultas' },
    { id: '10', nome: 'Lazer', tipo: 'Despesa', descricao: 'Cinema, streaming' },
  ])

  const contas = useState<Conta[]>('contas', () => [
    { id: '1', nome: 'Conta Corrente', tipo: 'Conta Corrente', instituicao: 'Banco', saldoInicial: 2500 },
    { id: '2', nome: 'Poupança', tipo: 'Conta Poupança', instituicao: 'Banco', saldoInicial: 5000 },
    { id: '3', nome: 'Cartão de Crédito', tipo: 'Cartão de Crédito', instituicao: 'Banco', saldoInicial: 0 },
    { id: '4', nome: 'Dinheiro', tipo: 'Dinheiro', instituicao: '-', saldoInicial: 300 },
  ])

  const lancamentos = useState<Lancamento[]>('lancamentos', () => {
    const hoje = new Date()
    return [
      {
        id: '1',
        data: new Date(hoje.getFullYear(), 0, 5).toISOString(),
        descricao: 'Salário mensal',
        categoriaId: '1',
        contaId: '1',
        valor: 5000,
        tipo: 'Receita',
        mes: 1,
        ano: hoje.getFullYear(),
      },
      {
        id: '2',
        data: new Date(hoje.getFullYear(), 0, 10).toISOString(),
        descricao: 'Aluguel',
        categoriaId: '6',
        contaId: '1',
        valor: -1200,
        tipo: 'Despesa',
        mes: 1,
        ano: hoje.getFullYear(),
      },
      {
        id: '3',
        data: new Date(hoje.getFullYear(), 0, 15).toISOString(),
        descricao: 'Supermercado',
        categoriaId: '4',
        contaId: '3',
        valor: -450,
        tipo: 'Despesa',
        mes: 1,
        ano: hoje.getFullYear(),
      },
    ]
  })

  // Funções CRUD - Categorias
  const adicionarCategoria = (categoria: Omit<Categoria, 'id'>) => {
    const novaCategoria: Categoria = {
      ...categoria,
      id: Date.now().toString(),
    }
    categorias.value = [...categorias.value, novaCategoria]
  }

  const editarCategoria = (id: string, dados: Partial<Categoria>) => {
    categorias.value = categorias.value.map(cat =>
      cat.id === id ? { ...cat, ...dados } : cat
    )
  }

  const excluirCategoria = (id: string) => {
    categorias.value = categorias.value.filter(cat => cat.id !== id)
  }

  // Funções CRUD - Contas
  const adicionarConta = (conta: Omit<Conta, 'id'>) => {
    const novaConta: Conta = {
      ...conta,
      id: Date.now().toString(),
    }
    contas.value = [...contas.value, novaConta]
  }

  const editarConta = (id: string, dados: Partial<Conta>) => {
    contas.value = contas.value.map(conta =>
      conta.id === id ? { ...conta, ...dados } : conta
    )
  }

  const excluirConta = (id: string) => {
    contas.value = contas.value.filter(conta => conta.id !== id)
  }

  // Funções CRUD - Lançamentos
  const adicionarLancamento = (lancamento: Omit<Lancamento, 'id'>) => {
    const novoLancamento: Lancamento = {
      ...lancamento,
      id: Date.now().toString(),
    }
    lancamentos.value = [...lancamentos.value, novoLancamento]
  }

  const editarLancamento = (id: string, dados: Partial<Lancamento>) => {
    lancamentos.value = lancamentos.value.map(lanc =>
      lanc.id === id ? { ...lanc, ...dados } : lanc
    )
  }

  const excluirLancamento = (id: string) => {
    lancamentos.value = lancamentos.value.filter(lanc => lanc.id !== id)
  }

  // Funções de cálculo
  const getLancamentosPorMes = (mes: number, ano: number) => {
    return lancamentos.value.filter(l => l.mes === mes && l.ano === ano)
  }

  const getResumoMensal = (mes: number, ano: number): ResumoMensal => {
    const lancsMes = getLancamentosPorMes(mes, ano)
    const totalReceitas = lancsMes
      .filter(l => l.valor > 0)
      .reduce((acc, l) => acc + l.valor, 0)
    const totalDespesas = lancsMes
      .filter(l => l.valor < 0)
      .reduce((acc, l) => acc + l.valor, 0)

    return {
      mes,
      ano,
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas + totalDespesas,
    }
  }

  const getResumoAnual = (ano: number) => {
    const resumos = Array.from({ length: 12 }, (_, i) => getResumoMensal(i + 1, ano))
    const totalReceitas = resumos.reduce((acc, r) => acc + r.totalReceitas, 0)
    const totalDespesas = resumos.reduce((acc, r) => acc + r.totalDespesas, 0)

    return {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas + totalDespesas,
      mediaReceitas: totalReceitas / 12,
      mediaDespesas: totalDespesas / 12,
      comparativoMensal: resumos,
    }
  }

  const getSaldoConta = (contaId: string) => {
    const conta = contas.value.find(c => c.id === contaId)
    if (!conta) return 0

    const movimentacao = lancamentos.value
      .filter(l => l.contaId === contaId)
      .reduce((acc, l) => acc + l.valor, 0)

    return conta.saldoInicial + movimentacao
  }

  return {
    // Estados
    categorias,
    contas,
    lancamentos,
    
    // CRUD Categorias
    adicionarCategoria,
    editarCategoria,
    excluirCategoria,
    
    // CRUD Contas
    adicionarConta,
    editarConta,
    excluirConta,
    
    // CRUD Lançamentos
    adicionarLancamento,
    editarLancamento,
    excluirLancamento,
    
    // Cálculos
    getLancamentosPorMes,
    getResumoMensal,
    getResumoAnual,
    getSaldoConta,
  }
}
