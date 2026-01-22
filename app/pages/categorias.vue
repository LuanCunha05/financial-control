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
import DropdownMenuTrigger from '~/components/ui/dropdown-menu/DropdownMenuTrigger.vue'
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'
import SelectValue from '~/components/ui/select/SelectValue.vue'
import type { Categoria } from '~/types'

const store = useFinanceiroStore()

// Computeds
const categoriasReceita = computed(() => store.categoriasReceita)
const categoriasDespesa = computed(() => store.categoriasDespesa)

// Controle do Dialog de Criar/Editar
const isFormDialogOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const formLoading = ref(false)
const formError = ref('')

// Form data
const formData = ref({
  nome: '',
  tipo: 'Despesa' as 'Receita' | 'Despesa',
  descricao: ''
})

// Abrir dialog para nova categoria
const abrirNovaCategoria = (tipo?: 'Receita' | 'Despesa') => {
  isEditing.value = false
  editingId.value = null
  formError.value = ''
  formData.value = {
    nome: '',
    tipo: tipo || 'Despesa',
    descricao: ''
  }
  isFormDialogOpen.value = true
}

// Abrir dialog para editar categoria
const abrirEditarCategoria = (categoria: Categoria) => {
  isEditing.value = true
  editingId.value = categoria.id
  formError.value = ''
  formData.value = {
    nome: categoria.nome,
    tipo: categoria.tipo,
    descricao: categoria.descricao || ''
  }
  isFormDialogOpen.value = true
}

// Salvar categoria (criar ou editar)
const salvarCategoria = async () => {
  if (!formData.value.nome.trim()) {
    formError.value = 'Nome é obrigatório'
    return
  }

  formLoading.value = true
  formError.value = ''

  try {
    if (isEditing.value && editingId.value) {
      await store.editarCategoria(editingId.value, {
        nome: formData.value.nome.trim(),
        tipo: formData.value.tipo,
        descricao: formData.value.descricao.trim() || undefined
      })
    } else {
      await store.adicionarCategoria({
        nome: formData.value.nome.trim(),
        tipo: formData.value.tipo,
        descricao: formData.value.descricao.trim() || undefined
      })
    }
    isFormDialogOpen.value = false
  } catch (err: any) {
    formError.value = err.message || 'Erro ao salvar categoria'
  } finally {
    formLoading.value = false
  }
}

// Controle do Dialog de Exclusao
const isDeleteAlertOpen = ref(false)
const itemToDelete = ref<string | null>(null)

// Abre o modal de confirmacao
const solicitarExclusao = (id: string) => {
  itemToDelete.value = id
  isDeleteAlertOpen.value = true
}

// Confirma a exclusao
const confirmarExclusao = async () => {
  if (itemToDelete.value) {
    await store.excluirCategoria(itemToDelete.value)
    itemToDelete.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight">Categorias</h1>
        <p class="text-muted-foreground">Classifique suas transacoes para relatorios precisos</p>
      </div>
      <Button @click="abrirNovaCategoria()">
        <Icon name="mdi:plus" class="mr-2 h-4 w-4" />
        Nova Categoria
      </Button>
    </div>

    <!-- Grid de Categorias -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Receitas -->
      <Card>
        <CardHeader class="border-b bg-green-50/50 dark:bg-green-950/20">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Icon name="mdi:trending-up" class="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle class="text-lg">Receitas</CardTitle>
                <CardDescription>Salarios, investimentos, vendas</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {{ categoriasReceita.length }}
            </Badge>
          </div>
        </CardHeader>

        <CardContent class="p-4">
          <div v-if="categoriasReceita.length === 0" class="text-center py-8">
            <div class="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
              <Icon name="mdi:tag-off" class="h-6 w-6 text-muted-foreground" />
            </div>
            <p class="text-sm text-muted-foreground">Nenhuma categoria de receita</p>
            <Button variant="outline" size="sm" class="mt-3" @click="abrirNovaCategoria('Receita')">
              <Icon name="mdi:plus" class="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="categoria in categoriasReceita"
              :key="categoria.id"
              class="group flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="w-1 h-8 bg-green-500 rounded-full" />
                <div>
                  <p class="font-medium text-sm">{{ categoria.nome }}</p>
                  <p v-if="categoria.descricao" class="text-xs text-muted-foreground line-clamp-1">
                    {{ categoria.descricao }}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon" class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name="mdi:dots-vertical" class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click="abrirEditarCategoria(categoria)">
                    <Icon name="mdi:pencil" class="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="solicitarExclusao(categoria.id)" class="text-red-600 focus:text-red-600">
                    <Icon name="mdi:trash-can-outline" class="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Despesas -->
      <Card>
        <CardHeader class="border-b bg-red-50/50 dark:bg-red-950/20">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Icon name="mdi:trending-down" class="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle class="text-lg">Despesas</CardTitle>
                <CardDescription>Contas fixas, lazer, alimentacao</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {{ categoriasDespesa.length }}
            </Badge>
          </div>
        </CardHeader>

        <CardContent class="p-4">
          <div v-if="categoriasDespesa.length === 0" class="text-center py-8">
            <div class="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
              <Icon name="mdi:tag-off" class="h-6 w-6 text-muted-foreground" />
            </div>
            <p class="text-sm text-muted-foreground">Nenhuma categoria de despesa</p>
            <Button variant="outline" size="sm" class="mt-3" @click="abrirNovaCategoria('Despesa')">
              <Icon name="mdi:plus" class="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="categoria in categoriasDespesa"
              :key="categoria.id"
              class="group flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="w-1 h-8 bg-red-500 rounded-full" />
                <div>
                  <p class="font-medium text-sm">{{ categoria.nome }}</p>
                  <p v-if="categoria.descricao" class="text-xs text-muted-foreground line-clamp-1">
                    {{ categoria.descricao }}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon" class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name="mdi:dots-vertical" class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click="abrirEditarCategoria(categoria)">
                    <Icon name="mdi:pencil" class="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="solicitarExclusao(categoria.id)" class="text-red-600 focus:text-red-600">
                    <Icon name="mdi:trash-can-outline" class="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Dica -->
    <Card class="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50">
      <CardContent class="flex gap-4 items-start p-4">
        <div class="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <Icon name="mdi:lightbulb-on-outline" class="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h4 class="font-semibold text-sm text-amber-800 dark:text-amber-400">Dica</h4>
          <p class="text-sm text-amber-700/80 dark:text-amber-500/80 mt-1">
            Evite categorias genericas como "Outros". Quanto mais especificas forem suas categorias,
            mais insights voce tera no Dashboard.
          </p>
        </div>
      </CardContent>
    </Card>

    <!-- Dialog de Criar/Editar Categoria -->
    <Dialog :open="isFormDialogOpen" @update:open="isFormDialogOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Editar Categoria' : 'Nova Categoria' }}</DialogTitle>
          <DialogDescription>
            {{ isEditing ? 'Altere os dados da categoria' : 'Preencha os dados para criar uma nova categoria' }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="salvarCategoria" class="space-y-4">
          <div v-if="formError" class="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
            <Icon name="mdi:alert-circle" class="h-4 w-4" />
            <span>{{ formError }}</span>
          </div>

          <div class="space-y-2">
            <Label for="nome">Nome</Label>
            <Input
              id="nome"
              v-model="formData.nome"
              placeholder="Ex: Alimentacao, Salario..."
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="tipo">Tipo</Label>
            <Select v-model="formData.tipo">
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Receita">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-green-500" />
                    Receita
                  </div>
                </SelectItem>
                <SelectItem value="Despesa">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-red-500" />
                    Despesa
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="descricao">Descricao (opcional)</Label>
            <Input
              id="descricao"
              v-model="formData.descricao"
              placeholder="Breve descricao da categoria"
            />
          </div>

          <DialogFooter class="gap-2 sm:gap-0">
            <Button type="button" variant="outline" @click="isFormDialogOpen = false">
              Cancelar
            </Button>
            <Button type="submit" :disabled="formLoading">
              <Icon v-if="formLoading" name="mdi:loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ isEditing ? 'Salvar' : 'Criar' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog de Exclusao -->
    <AlertDialog :open="isDeleteAlertOpen" @update:open="isDeleteAlertOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover Categoria?</AlertDialogTitle>
          <AlertDialogDescription>
            Se houver lancamentos vinculados a esta categoria, eles ficarao sem classificacao.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="isDeleteAlertOpen = false">Cancelar</AlertDialogCancel>
          <AlertDialogAction @click="confirmarExclusao" class="bg-red-600 hover:bg-red-700">
            Sim, remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
