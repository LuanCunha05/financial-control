<script setup lang="ts">
import AlertDialog from '~/components/ui/alert-dialog/AlertDialog.vue'
import AlertDialogAction from '~/components/ui/alert-dialog/AlertDialogAction.vue'
import AlertDialogCancel from '~/components/ui/alert-dialog/AlertDialogCancel.vue'
import AlertDialogContent from '~/components/ui/alert-dialog/AlertDialogContent.vue'
import AlertDialogDescription from '~/components/ui/alert-dialog/AlertDialogDescription.vue'
import AlertDialogFooter from '~/components/ui/alert-dialog/AlertDialogFooter.vue'
import AlertDialogHeader from '~/components/ui/alert-dialog/AlertDialogHeader.vue'
import AlertDialogTitle from '~/components/ui/alert-dialog/AlertDialogTitle.vue'
import Badge from '~/components/ui/badge/Badge.vue'
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
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'
import SelectValue from '~/components/ui/select/SelectValue.vue'
import Separator from '~/components/ui/separator/Separator.vue'
import type { Conta } from '~/types'

const store = useFinanceiroStore()

// --- Lógica de Formulário (Criar/Editar) ---
const isFormDialogOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const formLoading = ref(false)
const formError = ref('')

// Dados do formulário
const formData = ref({
  nome: '',
  instituicao: '',
  tipo: 'Conta Corrente',
  saldoInicial: 0 as number | string
})

const abrirNovaConta = () => {
  isEditing.value = false
  editingId.value = null
  formError.value = ''
  formData.value = {
    nome: '',
    instituicao: '',
    tipo: 'Conta Corrente',
    saldoInicial: 0
  }
  isFormDialogOpen.value = true
}

const abrirEditarConta = (conta: Conta) => {
  isEditing.value = true
  editingId.value = conta.id
  formError.value = ''
  formData.value = {
    nome: conta.nome,
    instituicao: conta.instituicao,
    tipo: conta.tipo,
    saldoInicial: conta.saldoInicial
  }
  isFormDialogOpen.value = true
}

const salvarConta = async () => {
  if (!formData.value.nome.trim()) {
    formError.value = 'Nome da conta é obrigatório'
    return
  }

  formLoading.value = true
  formError.value = ''

  try {
    // CORREÇÃO: "as any" resolve o erro de incompatibilidade de tipos literais
    const payload = {
      nome: formData.value.nome.trim(),
      instituicao: formData.value.instituicao.trim(),
      tipo: formData.value.tipo as any, 
      saldoInicial: Number(formData.value.saldoInicial)
    }

    if (isEditing.value && editingId.value) {
      await store.editarConta(editingId.value, payload)
    } else {
      await store.adicionarConta(payload)
    }
    isFormDialogOpen.value = false
  } catch (err: any) {
    formError.value = err.message || 'Erro ao salvar conta'
  } finally {
    formLoading.value = false
  }
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
    await store.excluirConta(itemToDelete.value)
    itemToDelete.value = null
  }
}

// Helpers e Computeds
const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

const getIconeConta = (tipo: string) => {
  const t = tipo.toLowerCase()
  if (t.includes('carteira') || t.includes('dinheiro')) return 'mdi:wallet'
  if (t.includes('poupança') || t.includes('investimento')) return 'mdi:piggy-bank'
  return 'mdi:bank'
}

const saldoTotal = computed(() => {
  return store.contas.reduce((acc, conta) => acc + store.saldoConta(conta.id), 0)
})
</script>

<template>
  <div class="space-y-6 pb-10">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight">Minhas Contas</h1>
        <p class="text-muted-foreground">Gerencie suas contas bancárias e carteiras</p>
      </div>
      <Button @click="abrirNovaConta()">
        <Icon name="mdi:plus" class="mr-2 h-4 w-4" />
        Nova Conta
      </Button>
    </div>

    <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-lg">
       <div class="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
       <div class="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
       <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-blue-100">
                <Icon name="mdi:safe" class="h-5 w-5" />
                <span class="text-sm font-medium uppercase tracking-wider">Patrimônio Total</span>
            </div>
            <div class="text-4xl md:text-5xl font-bold tracking-tight">
                {{ formatarMoeda(saldoTotal) }}
            </div>
            <p class="text-sm text-blue-100/80">Soma de todos os saldos atuais</p>
          </div>
          <div class="flex items-center gap-4 bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10">
              <div class="bg-white/20 p-3 rounded-full">
                  <Icon name="mdi:chart-box-outline" class="h-6 w-6 text-white" />
              </div>
              <div>
                  <div class="text-2xl font-bold">{{ store.contas.length }}</div>
                  <div class="text-xs text-blue-100">Contas Ativas</div>
              </div>
          </div>
       </div>
    </div>

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="conta in store.contas" :key="conta.id" class="group hover:shadow-md transition-all duration-300 border-t-4 border-t-transparent hover:border-t-primary">
        <CardHeader class="flex flex-row items-start justify-between pb-2">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <Icon :name="getIconeConta(conta.tipo)" class="h-5 w-5 text-primary group-hover:text-white" />
            </div>
            <div>
                <CardTitle class="text-base font-semibold">{{ conta.nome }}</CardTitle>
                <div class="flex items-center gap-2 mt-1">
                     <Badge variant="secondary" class="text-[10px] h-5 px-1.5 font-normal">
                        {{ conta.tipo }}
                     </Badge>
                </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" class="h-8 w-8 -mr-2">
                <Icon name="mdi:dots-vertical" class="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="abrirEditarConta(conta)">
                <Icon name="mdi:pencil" class="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="solicitarExclusao(conta.id)" class="text-red-600 focus:text-red-600">
                <Icon name="mdi:trash-can-outline" class="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent class="space-y-4 pt-2">
            <div class="text-sm text-muted-foreground flex items-center gap-2">
                <Icon name="mdi:office-building" class="h-4 w-4 opacity-50" />
                {{ conta.instituicao || 'Não informada' }}
            </div>
            <Separator />
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <p class="text-[10px] text-muted-foreground uppercase font-semibold">Saldo Inicial</p>
                    <p class="text-sm font-medium">{{ formatarMoeda(conta.saldoInicial) }}</p>
                </div>
                <div class="space-y-1">
                    <p class="text-[10px] text-muted-foreground uppercase font-semibold">Movimentação</p>
                    <p class="text-sm font-medium" :class="store.saldoConta(conta.id) - conta.saldoInicial >= 0 ? 'text-green-600' : 'text-red-600'">
                         {{ formatarMoeda(store.saldoConta(conta.id) - conta.saldoInicial) }}
                    </p>
                </div>
            </div>
            <div class="bg-muted/50 p-3 rounded-lg flex justify-between items-center mt-2">
                <span class="text-xs font-semibold text-muted-foreground uppercase">Saldo Atual</span>
                <span class="text-lg font-bold" :class="store.saldoConta(conta.id) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'">
                    {{ formatarMoeda(store.saldoConta(conta.id)) }}
                </span>
            </div>
        </CardContent>
      </Card>
      <button @click="abrirNovaConta()" class="flex flex-col items-center justify-center h-full min-h-[220px] rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group p-6">
        <div class="h-12 w-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
            <Icon name="mdi:plus" class="h-6 w-6 text-muted-foreground group-hover:text-primary" />
        </div>
        <h3 class="font-semibold text-lg text-foreground">Nova Conta</h3>
        <p class="text-sm text-muted-foreground text-center max-w-[200px] mt-1">
            Adicione um banco, carteira ou poupança
        </p>
      </button>
    </div>

    <Dialog :open="isFormDialogOpen" @update:open="isFormDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Editar Conta' : 'Nova Conta' }}</DialogTitle>
          <DialogDescription>
            {{ isEditing ? 'Atualize as informações da conta.' : 'Preencha os dados para criar uma nova conta.' }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="salvarConta" class="space-y-4 mt-2">
           <div v-if="formError" class="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
            <Icon name="mdi:alert-circle" class="h-4 w-4" />
            <span>{{ formError }}</span>
          </div>
          <div class="space-y-2">
            <Label for="nome">Nome da Conta</Label>
            <Input id="nome" v-model="formData.nome" placeholder="Ex: Nubank, Carteira..." required />
          </div>
          <div class="space-y-2">
            <Label for="instituicao">Instituição</Label>
            <Input id="instituicao" v-model="formData.instituicao" placeholder="Ex: Nu Pagamentos S.A." />
          </div>
          <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="tipo">Tipo</Label>
                <Select v-model="formData.tipo">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                    <SelectItem value="Poupança">Poupança</SelectItem>
                    <SelectItem value="Investimento">Investimento</SelectItem>
                    <SelectItem value="Carteira">Carteira / Dinheiro</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="saldoInicial">Saldo Inicial</Label>
                <Input id="saldoInicial" type="number" step="0.01" v-model="formData.saldoInicial" />
              </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="isFormDialogOpen = false">Cancelar</Button>
            <Button type="submit" :disabled="formLoading">
               <Icon v-if="formLoading" name="mdi:loading" class="mr-2 h-4 w-4 animate-spin" />
               {{ isEditing ? 'Salvar Alterações' : 'Criar Conta' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="isDeleteAlertOpen" @update:open="isDeleteAlertOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Atenção: Ao excluir esta conta, <strong>todos os lançamentos vinculados a ela também serão excluídos</strong>.
            Essa ação é irreversível.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="isDeleteAlertOpen = false">Cancelar</AlertDialogCancel>
          <AlertDialogAction @click="confirmarExclusao" class="bg-red-600 hover:bg-red-700 text-white">
            Sim, excluir conta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>