// stores/financeiro.ts
import { defineStore } from 'pinia'
import type { Categoria, Conta, Lancamento, ResumoMensal } from '~/types'

// Helpers para converter entre camelCase (app) e snake_case (Supabase)
const mapContaFromDB = (data: any): Conta => ({
  id: data.id,
  nome: data.nome,
  tipo: data.tipo,
  instituicao: data.instituicao,
  saldoInicial: data.saldo_inicial,
})

const mapContaToDB = (conta: Omit<Conta, 'id'>) => ({
  nome: conta.nome,
  tipo: conta.tipo,
  instituicao: conta.instituicao,
  saldo_inicial: conta.saldoInicial,
})

const mapLancamentoFromDB = (data: any): Lancamento => ({
  id: data.id,
  data: data.data,
  descricao: data.descricao,
  categoriaId: data.categoria_id,
  contaId: data.conta_id,
  valor: data.valor,
  tipo: data.tipo,
  mes: data.mes,
  ano: data.ano,
  observacoes: data.observacoes,
  comprovanteUrl: data.comprovante_url,
  comprovanteTextoOCR: data.comprovante_texto_ocr,
})

const mapLancamentoToDB = (lanc: Omit<Lancamento, 'id'>) => ({
  data: lanc.data,
  descricao: lanc.descricao,
  categoria_id: lanc.categoriaId,
  conta_id: lanc.contaId,
  valor: lanc.valor,
  tipo: lanc.tipo,
  mes: lanc.mes,
  ano: lanc.ano,
  observacoes: lanc.observacoes,
  comprovante_url: lanc.comprovanteUrl,
  comprovante_texto_ocr: lanc.comprovanteTextoOCR,
})

export const useFinanceiroStore = defineStore('financeiro', {
  state: () => ({
    categorias: [] as Categoria[],
    contas: [] as Conta[],
    lancamentos: [] as Lancamento[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    categoriasReceita: (state) => state.categorias.filter(c => c.tipo === 'Receita'),
    categoriasDespesa: (state) => state.categorias.filter(c => c.tipo === 'Despesa'),

    lancamentosPorMes: (state) => (mes: number, ano: number) => {
      return state.lancamentos.filter(l => l.mes === mes && l.ano === ano)
    },

    resumoMensal: (state) => (mes: number, ano: number): ResumoMensal => {
      const lancsMes = state.lancamentos.filter(l => l.mes === mes && l.ano === ano)
      const totalReceitas = lancsMes.filter(l => l.valor > 0).reduce((acc, l) => acc + l.valor, 0)
      const totalDespesas = lancsMes.filter(l => l.valor < 0).reduce((acc, l) => acc + l.valor, 0)

      return { mes, ano, totalReceitas, totalDespesas, saldo: totalReceitas + totalDespesas }
    },

    resumoAnual: (state) => (ano: number) => {
      const resumos = Array.from({ length: 12 }, (_, i) => {
        const lancsMes = state.lancamentos.filter(l => l.mes === i + 1 && l.ano === ano)
        const totalReceitas = lancsMes.filter(l => l.valor > 0).reduce((acc, l) => acc + l.valor, 0)
        const totalDespesas = lancsMes.filter(l => l.valor < 0).reduce((acc, l) => acc + l.valor, 0)
        return { mes: i + 1, ano, totalReceitas, totalDespesas, saldo: totalReceitas + totalDespesas }
      })

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
    },

    saldoConta: (state) => (contaId: string) => {
      const conta = state.contas.find(c => c.id === contaId)
      if (!conta) return 0
      const movimentacao = state.lancamentos.filter(l => l.contaId === contaId).reduce((acc, l) => acc + l.valor, 0)
      return conta.saldoInicial + movimentacao
    },
  },

  actions: {
    // Inicializar dados do Supabase
    async carregarDados() {
      this.loading = true
      this.error = null

      try {
        const supabase: any = useSupabaseClient()
        const user = useSupabaseUser()

        if (!user.value) {
          console.log('User not authenticated yet, skipping data load')
          this.loading = false
          return
        }

        const userId = user.value?.id || (user.value as any)?.sub

        if (!userId || userId === 'undefined') {
          console.log('User ID is invalid:', userId)
          this.loading = false
          return
        }

        // Carregar categorias (não precisa mapear, campos são iguais)
        const { data: cats, error: catError } = await supabase
          .from('categorias')
          .select('id, nome, tipo, descricao')
          .eq('user_id', userId)

        if (catError) throw catError
        this.categorias = (cats || []) as Categoria[]

        // Carregar contas (precisa mapear saldo_inicial -> saldoInicial)
        const { data: conts, error: contError } = await supabase
          .from('contas')
          .select('id, nome, tipo, instituicao, saldo_inicial')
          .eq('user_id', userId)

        if (contError) throw contError
        this.contas = (conts || []).map(mapContaFromDB)

        // Carregar lançamentos (precisa mapear categoria_id, conta_id)
        const { data: lancs, error: lancError } = await supabase
          .from('lancamentos')
          .select('id, data, descricao, categoria_id, conta_id, valor, tipo, mes, ano, observacoes, comprovante_url, comprovante_texto_ocr')
          .eq('user_id', userId)
          .order('data', { ascending: false })

        if (lancError) throw lancError
        this.lancamentos = (lancs || []).map(mapLancamentoFromDB)

      } catch (err: any) {
        this.error = err.message
        console.error('Erro ao carregar dados:', err)
      } finally {
        this.loading = false
      }
    },

    // CRUD Categorias
    // stores/financeiro.ts

// ... dentro de actions

async adicionarCategoria(categoria: Omit<Categoria, 'id'>) {
  try {
    const supabase: any = useSupabaseClient()
    const user = useSupabaseUser()
    
    // --- CORREÇÃO AQUI ---
    // Tentamos pegar o ID. Se não existir, pegamos o 'sub' (fazemos cast para any para o TS não reclamar)
    const userId = user.value?.id || (user.value as any)?.sub

    if (!userId) {
      throw new Error('Utilizador não identificado (ID ausente)')
    }
    // ---------------------

    const { data, error } = await supabase
      .from('categorias')
      .insert([{ 
        ...categoria, 
        user_id: userId // Usamos a variável segura que criamos acima
      }])
      .select('id, nome, tipo, descricao')
      .single()

    if (error) throw error
    this.categorias.push(data as Categoria)
  } catch (err: any) {
    this.error = err.message
    console.error('Erro detalhado:', err)
    throw err
  }
},
    async editarCategoria(id: string, dados: Partial<Categoria>) {
      try {
        const supabase: any = useSupabaseClient()

        const { data, error } = await supabase
          .from('categorias')
          .update(dados)
          .eq('id', id)
          .select('id, nome, tipo, descricao')
          .single()

        if (error) throw error

        const index = this.categorias.findIndex(c => c.id === id)
        if (index !== -1) this.categorias[index] = data as Categoria
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    async excluirCategoria(id: string) {
      try {
        const supabase: any = useSupabaseClient()

        const { error } = await supabase
          .from('categorias')
          .delete()
          .eq('id', id)

        if (error) throw error
        this.categorias = this.categorias.filter(c => c.id !== id)
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    // CRUD Contas
    async adicionarConta(conta: Omit<Conta, 'id'>) {
      try {
        const supabase: any = useSupabaseClient()
        const user = useSupabaseUser()

        const { data, error } = await supabase
          .from('contas')
          .insert([{ ...mapContaToDB(conta), user_id: user.value?.id || (user.value as any)?.sub}])
          .select('id, nome, tipo, instituicao, saldo_inicial')
          .single()

        if (error) throw error
        this.contas.push(mapContaFromDB(data))
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    async editarConta(id: string, dados: Partial<Conta>) {
      try {
        const supabase: any = useSupabaseClient()

        // Mapear campos para snake_case se necessário
        const dbDados: any = { ...dados }
        if ('saldoInicial' in dados) {
          dbDados.saldo_inicial = dados.saldoInicial
          delete dbDados.saldoInicial
        }

        const { data, error } = await supabase
          .from('contas')
          .update(dbDados)
          .eq('id', id)
          .select('id, nome, tipo, instituicao, saldo_inicial')
          .single()

        if (error) throw error

        const index = this.contas.findIndex(c => c.id === id)
        if (index !== -1) this.contas[index] = mapContaFromDB(data)
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    async excluirConta(id: string) {
      try {
        const supabase: any = useSupabaseClient()

        const { error } = await supabase
          .from('contas')
          .delete()
          .eq('id', id)

        if (error) throw error
        this.contas = this.contas.filter(c => c.id !== id)
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    // CRUD Lançamentos
    async adicionarLancamento(lancamento: Omit<Lancamento, 'id'>) {
      try {
        const supabase: any = useSupabaseClient()
        const user = useSupabaseUser()

        console.log('🔵 [STORE] Recebendo lançamento para salvar:', lancamento)

        const dadosMapeados = mapLancamentoToDB(lancamento)
        console.log('🔵 [STORE] Dados mapeados para o banco:', dadosMapeados)

        const dadosParaInserir = { ...dadosMapeados, user_id: user.value?.id || (user.value as any)?.sub }
        console.log('🔵 [STORE] Dados finais para inserir (com user_id):', dadosParaInserir)

        const { data, error } = await supabase
          .from('lancamentos')
          .insert([dadosParaInserir])
          .select('id, data, descricao, categoria_id, conta_id, valor, tipo, mes, ano, observacoes, comprovante_url, comprovante_texto_ocr')
          .single()

        if (error) {
          console.error('❌ [STORE] Erro ao inserir no banco:', error)
          throw error
        }

        console.log('✅ [STORE] Lançamento inserido com sucesso:', data)
        this.lancamentos.push(mapLancamentoFromDB(data))
      } catch (err: any) {
        console.error('❌ [STORE] Erro geral ao adicionar lançamento:', err)
        this.error = err.message
        throw err
      }
    },

    async editarLancamento(id: string, dados: Partial<Lancamento>) {
      try {
        const supabase: any = useSupabaseClient()

        // Mapear campos para snake_case
        const dbDados: any = { ...dados }
        if ('categoriaId' in dados) {
          dbDados.categoria_id = dados.categoriaId
          delete dbDados.categoriaId
        }
        if ('contaId' in dados) {
          dbDados.conta_id = dados.contaId
          delete dbDados.contaId
        }

        const { data, error } = await supabase
          .from('lancamentos')
          .update(dbDados)
          .eq('id', id)
          .select('id, data, descricao, categoria_id, conta_id, valor, tipo, mes, ano, observacoes, comprovante_url, comprovante_texto_ocr')
          .single()

        if (error) throw error

        const index = this.lancamentos.findIndex(l => l.id === id)
        if (index !== -1) this.lancamentos[index] = mapLancamentoFromDB(data)
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    async excluirLancamento(id: string) {
      try {
        const supabase: any = useSupabaseClient()

        const { error } = await supabase
          .from('lancamentos')
          .delete()
          .eq('id', id)

        if (error) throw error
        this.lancamentos = this.lancamentos.filter(l => l.id !== id)
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },
  },
})
