<script setup lang="ts">
import Avatar from '~/components/ui/avatar/Avatar.vue'
import AvatarFallback from '~/components/ui/avatar/AvatarFallback.vue'
import AvatarImage from '~/components/ui/avatar/AvatarImage.vue'
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'
import SelectValue from '~/components/ui/select/SelectValue.vue'
import { MESES } from '~/types'

const store = useFinanceiroStore()
const user = useSupabaseUser()
const colorMode = useColorMode()
const { settings } = useSettings()

// Dados
const mesAtual = new Date().getMonth() + 1
const anoAtual = new Date().getFullYear()
const mesSelecionado = ref<number>(mesAtual)

const resumoMes = computed(() => {
  const mesNum = typeof mesSelecionado.value === 'string' ? parseInt(mesSelecionado.value) : mesSelecionado.value
  return store.resumoMensal(mesNum, anoAtual)
})
const resumoAnual = computed(() => store.resumoAnual(anoAtual))

// Usuario
const nomeUsuario = computed(() => {
  // Usar o nome das configurações
  if (settings.value.displayName) {
    return settings.value.displayName.split(' ')[0]
  }
  if (user.value?.email) {
    return user.value.email.split('@')[0]
  }
  return 'Visitante'
})

// Avatar do usuário
const userAvatar = computed(() => {
  return settings.value.avatarUrl || user.value?.user_metadata?.avatar_url || null
})

// Ultimos lancamentos
const ultimosLancamentos = computed(() => {
  return store.lancamentos
    .slice()
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5)
})

// Saldo total das contas
const saldoTotal = computed(() => {
  return store.contas.reduce((acc, conta) => acc + store.saldoConta(conta.id), 0)
})

// Gastos por categoria (mes selecionado)
const gastosPorCategoria = computed(() => {
  const mesNum = typeof mesSelecionado.value === 'string' ? parseInt(mesSelecionado.value) : mesSelecionado.value
  const lancsMes = store.lancamentos.filter(
    l => l.mes === mesNum && l.ano === anoAtual && l.valor < 0
  )

  const grouped = lancsMes.reduce((acc, lanc) => {
    const catNome = store.categorias.find(c => c.id === lanc.categoriaId)?.nome || 'Sem categoria'
    if (!acc[catNome]) acc[catNome] = 0
    acc[catNome] += Math.abs(lanc.valor)
    return acc
  }, {} as Record<string, number>)

  const valores = Object.values(grouped) as number[]
  const total = valores.reduce((sum: number, v: number) => sum + v, 0)

  return (Object.entries(grouped) as [string, number][])
    .map(([nome, valor]: [string, number]) => ({
      nome,
      valor,
      percentual: total > 0 ? (valor / total) * 100 : 0
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)
})

// Evolucao mensal (ultimos 6 meses)
const evolucaoMensal = computed(() => {
  const meses = []
  for (let i = 5; i >= 0; i--) {
    let mes = mesAtual - i
    let ano = anoAtual
    if (mes <= 0) {
      mes += 12
      ano -= 1
    }
    const resumo = store.resumoMensal(mes, ano)
    meses.push({
      mes,
      ano,
      label: MESES[mes - 1]?.substring(0, 3) || '',
      receitas: resumo.totalReceitas,
      despesas: Math.abs(resumo.totalDespesas),
      saldo: resumo.saldo
    })
  }
  return meses
})

// Categorias mais usadas
const topCategorias = computed(() => {
  const mesNum = typeof mesSelecionado.value === 'string' ? parseInt(mesSelecionado.value) : mesSelecionado.value
  const contagem: Record<string, number> = {}
  store.lancamentos
    .filter(l => l.mes === mesNum && l.ano === anoAtual)
    .forEach(l => {
      const catNome = store.categorias.find(c => c.id === l.categoriaId)?.nome || 'Sem categoria'
      contagem[catNome] = (contagem[catNome] || 0) + 1
    })

  return (Object.entries(contagem) as [string, number][])
    .map(([nome, qtd]: [string, number]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 3)
})

// Formatadores
const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

const formatarData = (data: string) => {
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const getCategoriaNome = (id: string) => {
  return store.categorias.find(c => c.id === id)?.nome || 'Sem categoria'
}

// Saudacao baseada na hora
const saudacao = computed(() => {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
})

// Configuracao do grafico de barras (Evolucao Mensal)
const chartOptionsBarras = computed(() => ({
  chart: {
    type: 'bar',
    height: 350,
    toolbar: { show: false },
    fontFamily: 'inherit',
    background: 'transparent',
  },
  theme: {
    mode: colorMode.value === 'dark' ? 'dark' : 'light',
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 4,
    },
  },
  dataLabels: { enabled: false },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent']
  },
  xaxis: {
    categories: evolucaoMensal.value.map(m => m.label),
  },
  yaxis: {
    labels: {
      formatter: (value: number) => formatarMoeda(value)
    }
  },
  fill: { opacity: 1 },
  tooltip: {
    y: {
      formatter: (value: number) => formatarMoeda(value)
    }
  },
  colors: ['#10b981', '#ef4444'],
  legend: {
    position: 'top',
    horizontalAlign: 'right',
  }
}))

const seriesBarras = computed(() => [
  {
    name: 'Receitas',
    data: evolucaoMensal.value.map(m => m.receitas)
  },
  {
    name: 'Despesas',
    data: evolucaoMensal.value.map(m => m.despesas)
  }
])

// Configuracao do grafico de pizza (Despesas por Categoria)
const chartOptionsPizza = computed(() => ({
  chart: {
    type: 'donut',
    height: 350,
    fontFamily: 'inherit',
    background: 'transparent',
  },
  theme: {
    mode: colorMode.value === 'dark' ? 'dark' : 'light',
  },
  labels: gastosPorCategoria.value.map(c => c.nome),
  colors: ['#3b82f6', '#10b981', '#a855f7', '#f97316', '#ec4899'],
  legend: {
    position: 'bottom',
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => `${val.toFixed(1)}%`
  },
  tooltip: {
    y: {
      formatter: (value: number) => formatarMoeda(value)
    }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total',
            formatter: () => {
              const total = gastosPorCategoria.value.reduce((sum, c) => sum + c.valor, 0)
              return formatarMoeda(total)
            }
          }
        }
      }
    }
  }
}))

const seriesPizza = computed(() => gastosPorCategoria.value.map(c => c.valor))
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <Avatar class="h-14 w-14 border-2 border-primary/20">
          <AvatarImage :src="userAvatar" />
          <AvatarFallback class="bg-primary/10 text-primary font-bold text-xl">
            {{ nomeUsuario?.charAt(0).toUpperCase() || '?' }}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 class="text-2xl lg:text-3xl font-bold tracking-tight">
            {{ saudacao }}, {{ nomeUsuario }}!
          </h1>
          <p class="text-muted-foreground">
            Dashboard financeiro de {{ anoAtual }}
          </p>
        </div>
      </div>

      <div class="flex gap-2 items-center">
        <Select v-model="mesSelecionado" :default-value="mesAtual">
          <SelectTrigger class="w-[140px]">
            <SelectValue :placeholder="MESES[mesAtual - 1]" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="(mes, idx) in MESES" :key="idx + 1" :value="idx + 1">
              {{ mes }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button @click="navigateTo('/lancamentos')">
          <Icon name="mdi:plus" class="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>
    </div>

    <!-- Cards do Mes -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="border-l-4 border-l-green-500">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">Receitas do Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-green-600">{{ formatarMoeda(resumoMes.totalReceitas) }}</div>
          <p class="text-xs text-muted-foreground mt-1">
            Media anual: {{ formatarMoeda(resumoAnual.mediaReceitas) }}
          </p>
        </CardContent>
      </Card>

      <Card class="border-l-4 border-l-red-500">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">Despesas do Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-red-600">{{ formatarMoeda(Math.abs(resumoMes.totalDespesas)) }}</div>
          <p class="text-xs text-muted-foreground mt-1">
            Media anual: {{ formatarMoeda(Math.abs(resumoAnual.mediaDespesas)) }}
          </p>
        </CardContent>
      </Card>

      <Card class="border-l-4 border-l-blue-500">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">Saldo do Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold" :class="resumoMes.saldo >= 0 ? 'text-blue-600' : 'text-red-600'">
            {{ formatarMoeda(resumoMes.saldo) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ resumoMes.saldo >= 0 ? 'Superavit' : 'Deficit' }} mensal
          </p>
        </CardContent>
      </Card>

      <Card class="border-l-4 border-l-purple-500">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">Patrimonio Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-purple-600">{{ formatarMoeda(saldoTotal) }}</div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ store.contas.length }} {{ store.contas.length === 1 ? 'conta' : 'contas' }}
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Graficos -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Evolucao Mensal -->
      <Card>
        <CardHeader>
          <CardTitle>Evolucao Mensal</CardTitle>
          <CardDescription>Ultimos 6 meses - Receitas vs Despesas</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientOnly>
            <apexchart
              type="bar"
              height="350"
              :options="chartOptionsBarras"
              :series="seriesBarras"
            />
            <template #fallback>
              <div class="h-[350px] flex items-center justify-center text-muted-foreground">
                <Icon name="mdi:loading" class="h-8 w-8 animate-spin" />
              </div>
            </template>
          </ClientOnly>
        </CardContent>
      </Card>

      <!-- Despesas por Categoria -->
      <Card>
        <CardHeader>
          <CardTitle>Despesas por Categoria</CardTitle>
          <CardDescription>{{ MESES[(typeof mesSelecionado === 'string' ? parseInt(mesSelecionado) : mesSelecionado) - 1] }} - Top 5 categorias</CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="gastosPorCategoria.length === 0" class="text-center py-16 text-muted-foreground">
            <Icon name="mdi:chart-pie" class="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p class="text-sm">Nenhuma despesa neste mes</p>
          </div>

          <ClientOnly v-else>
            <apexchart
              type="donut"
              height="350"
              :options="chartOptionsPizza"
              :series="seriesPizza"
            />
            <template #fallback>
              <div class="h-[350px] flex items-center justify-center text-muted-foreground">
                <Icon name="mdi:loading" class="h-8 w-8 animate-spin" />
              </div>
            </template>
          </ClientOnly>
        </CardContent>
      </Card>
    </div>

    <!-- Grid Secundario -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Ultimos Lancamentos -->
      <Card class="lg:col-span-2">
        <CardHeader class="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transacoes Recentes</CardTitle>
            <CardDescription>Ultimas movimentacoes</CardDescription>
          </div>
          <Button variant="ghost" size="sm" @click="navigateTo('/lancamentos')">
            Ver todos
            <Icon name="mdi:arrow-right" class="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div v-if="ultimosLancamentos.length === 0" class="text-center py-8 text-muted-foreground">
            <Icon name="mdi:receipt-text-outline" class="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum lancamento registrado</p>
            <Button variant="outline" class="mt-4" @click="navigateTo('/lancamentos')">
              <Icon name="mdi:plus" class="mr-2 h-4 w-4" />
              Adicionar primeiro
            </Button>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="lancamento in ultimosLancamentos"
              :key="lancamento.id"
              class="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div class="flex items-center gap-3">
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
                  <p class="font-medium text-sm truncate">{{ lancamento.descricao }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ getCategoriaNome(lancamento.categoriaId) }} • {{ formatarData(lancamento.data) }}
                  </p>
                </div>
              </div>
              <span
                class="font-semibold tabular-nums flex-shrink-0"
                :class="lancamento.valor > 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ formatarMoeda(Math.abs(lancamento.valor)) }}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Insights -->
      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
          <CardDescription>Analise do mes</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Top Categorias -->
          <div>
            <p class="text-sm font-medium mb-2">Categorias mais usadas</p>
            <div class="space-y-2">
              <div v-for="(cat, idx) in topCategorias" :key="idx" class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">{{ cat.nome }}</span>
                <Badge variant="secondary">{{ cat.qtd }}</Badge>
              </div>
              <div v-if="topCategorias.length === 0" class="text-xs text-muted-foreground text-center py-2">
                Nenhum lancamento
              </div>
            </div>
          </div>

          <Separator />

          <!-- Contas -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium">Minhas Contas</p>
              <Button variant="ghost" size="sm" @click="navigateTo('/contas')">
                <Icon name="mdi:cog" class="h-4 w-4" />
              </Button>
            </div>
            <div v-if="store.contas.length === 0" class="text-center py-4 text-muted-foreground">
              <Icon name="mdi:bank-off" class="h-8 w-8 mx-auto mb-1 opacity-50" />
              <p class="text-xs">Nenhuma conta</p>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="conta in store.contas.slice(0, 3)"
                :key="conta.id"
                class="flex items-center justify-between p-2 rounded-lg bg-muted/30"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="mdi:bank" class="h-3 w-3 text-primary" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-xs truncate">{{ conta.nome }}</p>
                    <p class="text-[10px] text-muted-foreground">{{ conta.tipo }}</p>
                  </div>
                </div>
                <span
                  class="font-semibold text-xs tabular-nums flex-shrink-0"
                  :class="store.saldoConta(conta.id) >= 0 ? 'text-foreground' : 'text-red-600'"
                >
                  {{ formatarMoeda(store.saldoConta(conta.id)) }}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Atalhos Rapidos -->
    <div class="grid gap-4 sm:grid-cols-3">
      <Button
        variant="outline"
        class="h-auto py-4 justify-start"
        @click="navigateTo('/lancamentos')"
      >
        <div class="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg mr-3">
          <Icon name="mdi:plus" class="h-5 w-5 text-green-600" />
        </div>
        <div class="text-left">
          <div class="font-semibold">Novo Lancamento</div>
          <div class="text-xs text-muted-foreground">Registrar receita ou despesa</div>
        </div>
      </Button>

      <Button
        variant="outline"
        class="h-auto py-4 justify-start"
        @click="navigateTo('/categorias')"
      >
        <div class="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg mr-3">
          <Icon name="mdi:tag-multiple" class="h-5 w-5 text-purple-600" />
        </div>
        <div class="text-left">
          <div class="font-semibold">Categorias</div>
          <div class="text-xs text-muted-foreground">Organizar gastos</div>
        </div>
      </Button>

      <Button
        variant="outline"
        class="h-auto py-4 justify-start"
        @click="navigateTo('/contas')"
      >
        <div class="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg mr-3">
          <Icon name="mdi:bank" class="h-5 w-5 text-amber-600" />
        </div>
        <div class="text-left">
          <div class="font-semibold">Contas</div>
          <div class="text-xs text-muted-foreground">Gerenciar bancos</div>
        </div>
      </Button>
    </div>
  </div>
</template>
