<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, parseDate } from '@internationalized/date'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-vue-next'
import AlertDialog from '~/components/ui/alert-dialog/AlertDialog.vue'
import AlertDialogAction from '~/components/ui/alert-dialog/AlertDialogAction.vue'
import AlertDialogCancel from '~/components/ui/alert-dialog/AlertDialogCancel.vue'
import AlertDialogContent from '~/components/ui/alert-dialog/AlertDialogContent.vue'
import AlertDialogDescription from '~/components/ui/alert-dialog/AlertDialogDescription.vue'
import AlertDialogFooter from '~/components/ui/alert-dialog/AlertDialogFooter.vue'
import AlertDialogHeader from '~/components/ui/alert-dialog/AlertDialogHeader.vue'
import AlertDialogTitle from '~/components/ui/alert-dialog/AlertDialogTitle.vue'
import Badge from '~/components/ui/badge/Badge.vue'
import Calendar from '~/components/ui/calendar/Calendar.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import DialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import DropdownMenu from '~/components/ui/dropdown-menu/DropdownMenu.vue'
import DropdownMenuContent from '~/components/ui/dropdown-menu/DropdownMenuContent.vue'
import DropdownMenuItem from '~/components/ui/dropdown-menu/DropdownMenuItem.vue'
import DropdownMenuSeparator from '~/components/ui/dropdown-menu/DropdownMenuSeparator.vue'
import DropdownMenuTrigger from '~/components/ui/dropdown-menu/DropdownMenuTrigger.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Popover from '~/components/ui/popover/Popover.vue'
import PopoverContent from '~/components/ui/popover/PopoverContent.vue'
import PopoverTrigger from '~/components/ui/popover/PopoverTrigger.vue'
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'
import SelectValue from '~/components/ui/select/SelectValue.vue'
import Separator from '~/components/ui/separator/Separator.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import { useComprovante } from '~/composables/useComprovante'
import { cn } from '~/lib/utils'
import { MESES, type Lancamento } from '~/types'

const store = useFinanceiroStore()

// --- Filtro de Mês da Lista ---
const anoAtual = new Date().getFullYear()
const mesSelecionado = ref(new Date().getMonth() + 1)

// --- Estado do Formulário ---
const isFormDialogOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const formLoading = ref(false)
const formError = ref('')

// Interface local para tipagem segura
interface LancamentoForm {
  descricao: string
  valor: number | string
  data: string
  tipo: 'Receita' | 'Despesa'
  categoriaId: string
  contaId: string
  observacoes: string
}

const formData = ref<LancamentoForm>({
  descricao: '',
  valor: 0,
  data: new Date().toISOString().split('T')?.[0] || '',
  tipo: 'Despesa',
  categoriaId: '',
  contaId: '',
  observacoes: ''
})

// Data para o Calendar (DateValue do Reka UI)
const dataCalendar = ref<DateValue>(parseDate(new Date().toISOString().split('T')[0] || '2026-01-19'))

// Atualiza a data do formulário quando o Calendar muda
const atualizarData = (date: DateValue | undefined) => {
  if (date && 'day' in date) {
    dataCalendar.value = date
    formData.value.data = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  }
}

// Converte string de data para DateValue
const stringParaDateValue = (dateString: string): DateValue => {
  return parseDate(dateString)
}

// Converte DateValue para Date nativo (para date-fns)
const dateValueParaDate = (dateValue: any): Date => {
  if (dateValue && typeof dateValue === 'object' && 'year' in dateValue && 'month' in dateValue && 'day' in dateValue) {
    return new Date(dateValue.year, dateValue.month - 1, dateValue.day)
  }
  return new Date()
}

// OCR de Comprovantes
const { processando: processandoOCR, progresso: progressoOCR, processarComprovante } = useOCR()
const { uploadComprovante } = useComprovante()
const inputComprovante = ref<HTMLInputElement | null>(null)
const imagemPreview = ref<string | null>(null)
const comprovanteFile = ref<File | null>(null)
const comprovanteTextoOCR = ref<string | null>(null)

const abrirSeletorComprovante = () => {
  inputComprovante.value?.click()
}

const handleComprovanteUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Validar tipo de arquivo
  if (!file.type.startsWith('image/')) {
    formError.value = 'Por favor, selecione uma imagem válida'
    return
  }

  // Validar tamanho (máx 5MB)
  if (file.size > 5 * 1024 * 1024) {
    formError.value = 'A imagem deve ter no máximo 5MB'
    return
  }

  try {
    // Mostrar preview da imagem
    const reader = new FileReader()
    reader.onload = (e) => {
      imagemPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)

    // Processar OCR
    formError.value = ''
    const dados = await processarComprovante(file)

    // Armazenar arquivo e texto OCR para upload posterior
    comprovanteFile.value = file
    comprovanteTextoOCR.value = dados.textoCompleto

    // Preencher formulário com dados extraídos
    if (dados.valor) {
      formData.value.valor = dados.valor
    }

    if (dados.data) {
      formData.value.data = dados.data
      dataCalendar.value = stringParaDateValue(dados.data)
    }

    if (dados.estabelecimento) {
      formData.value.descricao = dados.estabelecimento
    }

    // Sugerir categoria baseada no texto OCR
    const categoriaSugerida = sugerirCategoria(dados.textoCompleto)
    if (categoriaSugerida) {
      formData.value.categoriaId = categoriaSugerida
    }

  } catch (error: any) {
    formError.value = error.message || 'Erro ao processar comprovante'
  } finally {
    // Limpar input para permitir selecionar a mesma imagem novamente
    if (target) target.value = ''
  }
}

const limparComprovante = () => {
  imagemPreview.value = null
  comprovanteFile.value = null
  comprovanteTextoOCR.value = null
}

// Categorias filtradas pelo tipo selecionado
const categoriasDisponiveis = computed(() => {
  return store.categorias.filter(c => c.tipo === formData.value.tipo)
})

// Sugere categoria baseada no texto OCR
const sugerirCategoria = (textoOCR: string): string | undefined => {
  const textoLower = textoOCR.toLowerCase()

  // Mapeamento de palavras-chave para categorias
  const palavrasChave: Record<string, string[]> = {
    // Alimentação
    alimentacao: ['supermercado', 'mercado', 'padaria', 'restaurante', 'lanchonete', 'fast food', 'ifood', 'uber eats', 'delivery', 'cafe', 'bar', 'pizza', 'hamburger', 'açougue', 'hortifruti'],

    // Transporte
    transporte: ['uber', '99', 'taxi', 'combustivel', 'gasolina', 'posto', 'estacionamento', 'pedagio', 'onibus', 'metro', 'trem'],

    // Saúde
    saude: ['farmacia', 'drogaria', 'hospital', 'clinica', 'medico', 'consulta', 'laboratorio', 'exame', 'dentista'],

    // Educação
    educacao: ['escola', 'faculdade', 'universidade', 'curso', 'livro', 'livraria', 'material escolar', 'papelaria'],

    // Lazer
    lazer: ['cinema', 'teatro', 'show', 'parque', 'ingresso', 'streaming', 'netflix', 'spotify', 'youtube', 'disney', 'amazon prime'],

    // Vestuário
    vestuario: ['roupa', 'calcado', 'sapato', 'tenis', 'camisa', 'loja de roupa', 'shopping'],

    // Moradia
    moradia: ['aluguel', 'condominio', 'luz', 'energia', 'agua', 'gas', 'internet', 'telefone', 'celular', 'claro', 'vivo', 'tim', 'oi'],

    // Outros
    outros: ['loja', 'compra', 'pagamento']
  }

  // Procura por palavras-chave no texto
  for (const [categoriaNome, palavras] of Object.entries(palavrasChave)) {
    for (const palavra of palavras) {
      if (textoLower.includes(palavra)) {
        // Busca categoria no store com nome similar
        const categoria = store.categorias.find(c =>
          c.nome.toLowerCase().includes(categoriaNome) ||
          categoriaNome.includes(c.nome.toLowerCase())
        )
        if (categoria) {
          return categoria.id
        }
      }
    }
  }

  return undefined
}

const abrirNovoLancamento = () => {
  isEditing.value = false
  editingId.value = null
  formError.value = ''
  imagemPreview.value = null
  const hoje = new Date()
  const hojeDateValue = stringParaDateValue(hoje.toISOString().split('T')[0] || '')
  dataCalendar.value = hojeDateValue
  formData.value = {
    descricao: '',
    valor: 0,
    data: format(hoje, 'yyyy-MM-dd'),
    tipo: 'Despesa',
    categoriaId: '',
    contaId: '',
    observacoes: ''
  }
  isFormDialogOpen.value = true
}

const abrirEditarLancamento = (lanc: Lancamento) => {
  isEditing.value = true
  editingId.value = lanc.id
  formError.value = ''

  // Tratamento seguro da data para o input HTML (YYYY-MM-DD)
  let dataFormatada = lanc.data ? String(lanc.data) : ''
  if(dataFormatada.includes('T')) {
    dataFormatada = dataFormatada.split('T')?.[0] || dataFormatada
  }

  // Converte a data string para DateValue para o Calendar
  dataCalendar.value = stringParaDateValue(dataFormatada)

  formData.value = {
    descricao: lanc.descricao,
    valor: Math.abs(lanc.valor),
    data: dataFormatada,
    tipo: lanc.tipo as 'Receita' | 'Despesa',
    categoriaId: lanc.categoriaId,
    contaId: lanc.contaId,
    observacoes: lanc.observacoes || ''
  }
  isFormDialogOpen.value = true
}

const salvarLancamento = async () => {
  if (!formData.value.descricao.trim()) {
    formError.value = 'A descrição é obrigatória'
    return
  }
  if (!formData.value.contaId) {
    formError.value = 'Selecione uma conta'
    return
  }
  if (!formData.value.categoriaId) {
    formError.value = 'Selecione uma categoria'
    return
  }

  formLoading.value = true
  formError.value = ''

  try {
    // 1. Garantir que temos uma string de data válida
    const dataStr = formData.value.data || new Date().toISOString().split('T')?.[0] || ''

    // 2. Extrair ano e mês com segurança
    const ano = parseInt(dataStr.split('-')?.[0] || '0')
    const mes = parseInt(dataStr.split('-')?.[1] || '0')

    let valorFinal = Math.abs(Number(formData.value.valor))
    if (formData.value.tipo === 'Despesa') {
      valorFinal = -valorFinal
    }

    // 3. Upload do comprovante (se houver)
    let comprovanteUrl: string | undefined
    let comprovanteOCR: string | undefined

    console.log('🔍 [SAVE] Verificando se há comprovante para upload:', {
      temFile: !!comprovanteFile.value,
      isEditing: isEditing.value,
      fileName: comprovanteFile.value?.name
    })

    if (comprovanteFile.value && !isEditing.value) {
      console.log('🔵 [SAVE] Iniciando upload do comprovante...')
      const resultado = await uploadComprovante(
        comprovanteFile.value,
        comprovanteTextoOCR.value || undefined
      )

      console.log('🔍 [SAVE] Resultado do upload:', resultado)

      if (resultado) {
        comprovanteUrl = resultado.url
        comprovanteOCR = resultado.textoOCR
        console.log('✅ [SAVE] Comprovante uploadado:', { comprovanteUrl, comprovanteOCR })
      } else {
        console.error('❌ [SAVE] Upload falhou - resultado é null')
      }
    }

    const payload = {
      descricao: formData.value.descricao.trim(),
      valor: valorFinal,
      data: dataStr, // Usa a variável segura 'dataStr'
      tipo: formData.value.tipo as 'Receita' | 'Despesa',
      categoriaId: formData.value.categoriaId,
      contaId: formData.value.contaId,
      observacoes: formData.value.observacoes.trim() || undefined,
      comprovanteUrl,
      comprovanteTextoOCR: comprovanteOCR,
      mes,
      ano
    }

    console.log('🔍 [SAVE] Payload final:', payload)

    if (isEditing.value && editingId.value) {
      await store.editarLancamento(editingId.value, payload)
    } else {
      await store.adicionarLancamento(payload)
    }
    isFormDialogOpen.value = false
  } catch (err: any) {
    formError.value = err.message || 'Erro ao salvar lançamento'
  } finally {
    formLoading.value = false
  }
}

// --- Lógica de Visualização de Comprovante ---
const isComprovanteDialogOpen = ref(false)
const comprovanteVisualizacao = ref<string | null>(null)

const visualizarComprovante = (url: string) => {
  comprovanteVisualizacao.value = url
  isComprovanteDialogOpen.value = true
}

const fecharComprovante = () => {
  isComprovanteDialogOpen.value = false
  comprovanteVisualizacao.value = null
}

// --- Lógica de Exclusão ---
const isDeleteAlertOpen = ref(false)
const itemToDelete = ref<string | null>(null)

const solicitarExclusao = (id: string) => {
  itemToDelete.value = id
  isDeleteAlertOpen.value = true
}

const confirmarExclusao = async () => {
  if (itemToDelete.value) {
    await store.excluirLancamento(itemToDelete.value)
    itemToDelete.value = null
  }
}

// --- Helpers e Computeds ---
const lancamentosFiltrados = computed(() => {
  return store.lancamentos
    .filter(l => l.mes === mesSelecionado.value && l.ano === anoAtual)
    .sort((a, b) => {
        // Ordenação segura
        const tA = a.data ? new Date(a.data).getTime() : 0
        const tB = b.data ? new Date(b.data).getTime() : 0
        return tB - tA
    })
})

const getCategoriaNome = (id: string) => store.categorias.find(c => c.id === id)?.nome || 'Sem categoria'
const getContaNome = (id: string) => store.contas.find(c => c.id === id)?.nome || 'Sem conta'
const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

const formatarData = (data: string) => {
   if (!data) return '-'
   const strData = String(data)
   try {
     const diaParte = strData.includes('T') ? (strData.split('T')?.[0] || strData) : strData
     // Se o split falhar ou retornar array curto, tratamos no catch ou if
     const partes = diaParte.split('-')
     if(partes.length < 3) return strData

     const [ano, mes, dia] = partes
     return `${dia}/${mes}/${ano}`
   } catch (e) {
     return strData
   }
}

const totalReceitas = computed(() => lancamentosFiltrados.value.filter(l => l.valor > 0).reduce((acc, l) => acc + l.valor, 0))
const totalDespesas = computed(() => lancamentosFiltrados.value.filter(l => l.valor < 0).reduce((acc, l) => acc + l.valor, 0))
const saldo = computed(() => totalReceitas.value + totalDespesas.value)
</script>

<template>
  <div class="space-y-6 pb-10">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight">Lançamentos</h1>
        <p class="text-muted-foreground">
          {{ MESES[mesSelecionado - 1] }} de {{ anoAtual }}
        </p>
      </div>
      <Button @click="abrirNovoLancamento()">
        <Icon name="mdi:plus" class="mr-2 h-4 w-4" />
        Novo Lançamento
      </Button>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <Card class="border-l-4 border-l-green-500">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-green-600">{{ formatarMoeda(totalReceitas) }}</div>
          <p class="text-xs text-muted-foreground mt-1">Entradas do mês</p>
        </CardContent>
      </Card>

      <Card class="border-l-4 border-l-red-500">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-red-600">{{ formatarMoeda(Math.abs(totalDespesas)) }}</div>
          <p class="text-xs text-muted-foreground mt-1">Saídas do mês</p>
        </CardContent>
      </Card>

      <Card class="border-l-4 border-l-blue-500">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold" :class="saldo >= 0 ? 'text-blue-600' : 'text-red-600'">
            {{ formatarMoeda(saldo) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">Balanço do mês</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="p-3">
        <div class="flex flex-wrap gap-1 justify-center">
          <Button
            v-for="(mes, index) in MESES"
            :key="index"
            :variant="mesSelecionado === index + 1 ? 'default' : 'ghost'"
            size="sm"
            class="rounded-full text-xs px-3"
            @click="mesSelecionado = index + 1"
          >
            {{ mes.substring(0, 3) }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Lançamentos de {{ MESES[mesSelecionado - 1] }}</CardDescription>
        </div>
        <Badge variant="outline">{{ lancamentosFiltrados.length }} registros</Badge>
      </CardHeader>

      <CardContent>
        <div v-if="lancamentosFiltrados.length === 0" class="text-center py-12">
          <div class="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <Icon name="mdi:receipt-text-outline" class="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 class="font-semibold text-lg">Nenhum lançamento</h3>
          <p class="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
            Não há registros para {{ MESES[mesSelecionado - 1] }}.
          </p>
          <Button variant="outline" class="mt-4" @click="abrirNovoLancamento()">
            <Icon name="mdi:plus" class="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="lancamento in lancamentosFiltrados"
            :key="lancamento.id"
            class="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div
                class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                :class="lancamento.valor > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'"
              >
                <Icon
                  :name="lancamento.valor > 0 ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                  :class="lancamento.valor > 0 ? 'text-green-600' : 'text-red-600'"
                  class="h-5 w-5"
                />
              </div>

              <div class="min-w-0">
                <p class="font-medium truncate">{{ lancamento.descricao }}</p>
                <div class="flex flex-wrap items-center gap-2 mt-1">
                  <span class="text-xs text-muted-foreground">
                    {{ formatarData(lancamento.data) }}
                  </span>
                  <Badge variant="secondary" class="text-[10px] h-5">
                    {{ getCategoriaNome(lancamento.categoriaId) }}
                  </Badge>
                  <Badge variant="outline" class="text-[10px] h-5">
                    {{ getContaNome(lancamento.contaId) }}
                  </Badge>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span
                class="font-bold tabular-nums text-right"
                :class="lancamento.valor > 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ formatarMoeda(Math.abs(lancamento.valor)) }}
              </span>

              <!-- Botão para visualizar comprovante -->
              <Button
                v-if="lancamento.comprovanteUrl"
                variant="ghost"
                size="icon"
                class="h-8 w-8 flex-shrink-0"
                @click="visualizarComprovante(lancamento.comprovanteUrl)"
                title="Ver comprovante"
              >
                <Icon name="mdi:file-image-outline" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon" class="h-8 w-8 flex-shrink-0">
                    <Icon name="mdi:dots-vertical" class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click="abrirEditarLancamento(lancamento)">
                    <Icon name="mdi:pencil" class="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click="solicitarExclusao(lancamento.id)" class="text-red-600 focus:text-red-600">
                    <Icon name="mdi:trash-can-outline" class="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog :open="isFormDialogOpen" @update:open="isFormDialogOpen = $event">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Editar Lançamento' : 'Novo Lançamento' }}</DialogTitle>
          <DialogDescription>
            {{ isEditing ? 'Altere os detalhes da transação.' : 'Adicione uma nova receita ou despesa.' }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="salvarLancamento" class="space-y-4 mt-2">
          <!-- Input oculto para upload de comprovante -->
          <input
            ref="inputComprovante"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleComprovanteUpload"
          />

          <!-- Alerta de erro -->
          <div v-if="formError" class="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
            <Icon name="mdi:alert-circle" class="h-4 w-4" />
            <span>{{ formError }}</span>
          </div>

          <!-- Botão de Scan de Comprovante -->
          <div v-if="!isEditing" class="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
            <Button
              type="button"
              variant="outline"
              class="w-full"
              @click="abrirSeletorComprovante"
              :disabled="processandoOCR"
            >
              <Icon v-if="!processandoOCR" name="mdi:camera" class="mr-2 h-5 w-5" />
              <Icon v-else name="mdi:loading" class="mr-2 h-5 w-5 animate-spin" />
              {{ processandoOCR ? `Processando... ${progressoOCR}%` : 'Escanear Comprovante com IA' }}
            </Button>
            <p class="text-xs text-muted-foreground mt-2">
              Tire uma foto do comprovante e a IA preencherá os dados automaticamente
            </p>

            <!-- Preview da imagem -->
            <div v-if="imagemPreview" class="mt-3 relative">
              <img :src="imagemPreview" alt="Preview" class="w-full h-32 object-cover rounded-lg" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                class="absolute top-1 right-1 h-6 w-6"
                @click="limparComprovante"
              >
                <Icon name="mdi:close" class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator v-if="!isEditing" class="my-4" />

          <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="tipo">Tipo</Label>
                <Select v-model="formData.tipo">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita">
                        <span class="flex items-center gap-2 text-green-600 font-medium">
                            <Icon name="mdi:arrow-up-circle" class="h-4 w-4" /> Receita
                        </span>
                    </SelectItem>
                    <SelectItem value="Despesa">
                        <span class="flex items-center gap-2 text-red-600 font-medium">
                            <Icon name="mdi:arrow-down-circle" class="h-4 w-4" /> Despesa
                        </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="valor">Valor</Label>
                <Input id="valor" type="number" step="0.01" v-model="formData.valor" required />
              </div>
          </div>
          <div class="space-y-2">
            <Label for="descricao">Descrição</Label>
            <Input id="descricao" v-model="formData.descricao" placeholder="Ex: Compras no Supermercado" required />
          </div>
          <div class="space-y-2">
            <Label for="data">Data</Label>
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  :class="cn(
                    'w-full justify-start text-left font-normal',
                    !dataCalendar && 'text-muted-foreground'
                  )"
                >
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{ dataCalendar ? format(dateValueParaDate(dataCalendar), 'PPP', { locale: ptBR }) : 'Selecione a data' }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <Calendar
                  :v-model="dataCalendar"
                  locale="pt-BR"
                  initial-focus
                  @update:model-value="atualizarData"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div class="grid grid-cols-2 gap-4">
               <div class="space-y-2">
                <Label for="categoria">Categoria</Label>
                <Select v-model="formData.categoriaId">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="cat in categoriasDisponiveis" :key="cat.id" :value="cat.id">
                      {{ cat.nome }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="categoriasDisponiveis.length === 0" class="text-[10px] text-muted-foreground">
                    Nenhuma categoria de {{ formData.tipo }} encontrada.
                </p>
              </div>
               <div class="space-y-2">
                <Label for="conta">Conta / Carteira</Label>
                <Select v-model="formData.contaId">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem v-for="conta in store.contas" :key="conta.id" :value="conta.id">
                      {{ conta.nome }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </div>
          <div class="space-y-2">
            <Label for="obs">Observações (opcional)</Label>
            <Textarea id="obs" v-model="formData.observacoes" placeholder="Detalhes adicionais..." class="resize-none" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="isFormDialogOpen = false">Cancelar</Button>
            <Button type="submit" :disabled="formLoading">
               <Icon v-if="formLoading" name="mdi:loading" class="mr-2 h-4 w-4 animate-spin" />
               {{ isEditing ? 'Salvar' : 'Adicionar' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="isDeleteAlertOpen" @update:open="isDeleteAlertOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Lançamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="isDeleteAlertOpen = false">Cancelar</AlertDialogCancel>
          <AlertDialogAction @click="confirmarExclusao" class="bg-red-600 hover:bg-red-700 text-white">
            Sim, excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Dialog para visualizar comprovante -->
    <Dialog :open="isComprovanteDialogOpen" @update:open="isComprovanteDialogOpen = $event">
      <DialogContent class="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Comprovante do Lançamento</DialogTitle>
          <DialogDescription>
            Visualize a imagem do comprovante anexado
          </DialogDescription>
        </DialogHeader>
        <div class="relative">
          <div class="max-h-[70vh] overflow-auto rounded-lg border bg-muted/10 p-2">
            <img
              v-if="comprovanteVisualizacao"
              :src="comprovanteVisualizacao"
              alt="Comprovante"
              class="w-full h-auto object-contain rounded"
            />
          </div>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="fecharComprovante">
            <Icon name="mdi:close" class="mr-2 h-4 w-4" />
            Fechar
          </Button>
          <a
            v-if="comprovanteVisualizacao"
            :href="comprovanteVisualizacao"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex"
          >
            <Button>
              <Icon name="mdi:open-in-new" class="mr-2 h-4 w-4" />
              Abrir em nova aba
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>