<script setup lang="ts">
import Avatar from '~/components/ui/avatar/Avatar.vue'
import AvatarFallback from '~/components/ui/avatar/AvatarFallback.vue'
import AvatarImage from '~/components/ui/avatar/AvatarImage.vue'
import DropdownMenu from '~/components/ui/dropdown-menu/DropdownMenu.vue'
import DropdownMenuContent from '~/components/ui/dropdown-menu/DropdownMenuContent.vue'
import DropdownMenuItem from '~/components/ui/dropdown-menu/DropdownMenuItem.vue'
import DropdownMenuLabel from '~/components/ui/dropdown-menu/DropdownMenuLabel.vue'
import DropdownMenuSeparator from '~/components/ui/dropdown-menu/DropdownMenuSeparator.vue'
import DropdownMenuTrigger from '~/components/ui/dropdown-menu/DropdownMenuTrigger.vue'
import Sheet from '~/components/ui/sheet/Sheet.vue'
import SheetContent from '~/components/ui/sheet/SheetContent.vue'
import SheetTrigger from '~/components/ui/sheet/SheetTrigger.vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
const route = useRoute()

const mobileMenuOpen = ref(false)
const colorMode = useColorMode()
const { settings } = useSettings()

const toggleDarkMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const navItems = [
  { label: 'Dashboard', to: '/', icon: 'mdi:view-dashboard' },
  { label: 'Lancamentos', to: '/lancamentos', icon: 'mdi:swap-horizontal' },
  { label: 'Categorias', to: '/categorias', icon: 'mdi:tag-multiple' },
  { label: 'Contas', to: '/contas', icon: 'mdi:bank' },
]

const userInitials = computed(() => {
  // Usar o nome das configurações
  if (settings.value.displayName) {
    return settings.value.displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  }
  if (user.value?.email) {
    return user.value.email.substring(0, 2).toUpperCase()
  }
  return '??'
})

const userName = computed(() => {
  // Usar o nome das configurações
  if (settings.value.displayName) {
    return settings.value.displayName
  }
  if (user.value?.email) {
    return user.value.email.split('@')[0]
  }
  return 'Usuário'
})

const userAvatar = computed(() => {
  return settings.value.avatarUrl || user.value?.user_metadata?.avatar_url || null
})

const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push('/login')
  } catch (error) {
    console.error('Erro ao sair:', error)
  }
}

const isActiveRoute = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="min-h-screen bg-background font-sans antialiased flex flex-col relative overflow-hidden">
    <!-- Background de tela cheia -->
    <div
      v-if="settings.showBackground && settings.backgroundUrl"
      class="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
      :style="{
        opacity: settings.backgroundOpacity / 100,
        backgroundImage: `url(${settings.backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }"
    />

    <!-- Header -->
    <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-4">
        <!-- Logo (Esquerda) -->
        <div class="flex-shrink-0">
          <NuxtLink to="/" class="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div class="bg-primary p-2 rounded-lg">
              <Icon name="mdi:finance" class="h-5 w-5 text-primary-foreground" />
            </div>
            <span class="font-bold text-lg hidden sm:inline-block">Financeiro</span>
          </NuxtLink>
        </div>

        <!-- Desktop Navigation (Centro) -->
        <nav class="hidden lg:flex items-center gap-1 flex-1 justify-center">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActiveRoute(item.to)
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
          >
            <Icon :name="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </NuxtLink>
        </nav>

        <!-- Right Side (Direita) -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <!-- Dark Mode Toggle -->
          <Button variant="ghost" size="icon" @click="toggleDarkMode" class="hidden lg:flex">
            <Icon v-if="colorMode.value === 'dark'" name="mdi:white-balance-sunny" class="h-5 w-5" />
            <Icon v-else name="mdi:weather-night" class="h-5 w-5" />
          </Button>

          <!-- Mobile Menu Button -->
          <Sheet v-model:open="mobileMenuOpen">
            <SheetTrigger as-child>
              <Button variant="ghost" size="icon" class="lg:hidden">
                <Icon name="mdi:menu" class="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" class="w-72 p-0">
              <div class="flex flex-col h-full">
                <!-- Mobile Header -->
                <div class="p-4 border-b">
                  <div class="flex items-center gap-3">
                    <div class="bg-primary p-2 rounded-lg">
                      <Icon name="mdi:finance" class="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span class="font-bold text-lg">Financeiro</span>
                  </div>
                </div>

                <!-- Mobile Navigation -->
                <nav class="flex-1 p-4 space-y-1">
                  <NuxtLink
                    v-for="item in navItems"
                    :key="item.to"
                    :to="item.to"
                    @click="mobileMenuOpen = false"
                    class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors"
                    :class="isActiveRoute(item.to)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
                  >
                    <Icon :name="item.icon" class="h-5 w-5" />
                    {{ item.label }}
                  </NuxtLink>

                  <div class="pt-2 mt-2 border-t">
                    <NuxtLink
                      to="/configuracoes"
                      @click="mobileMenuOpen = false"
                      class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors"
                      :class="isActiveRoute('/configuracoes')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
                    >
                      <Icon name="mdi:cog" class="h-5 w-5" />
                      Configurações
                    </NuxtLink>
                  </div>
                </nav>

                <!-- Mobile User Section -->
                <div class="p-4 border-t bg-muted/30">
                  <div class="flex items-center gap-3 mb-3">
                    <Avatar class="h-10 w-10 border">
                      <AvatarImage :src="userAvatar" />
                      <AvatarFallback class="bg-primary/10 text-primary font-bold">
                        {{ userInitials }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">{{ userName }}</p>
                      <p class="text-xs text-muted-foreground truncate">{{ user?.email }}</p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <Button variant="outline" size="icon" @click="toggleDarkMode" class="flex-shrink-0">
                      <Icon v-if="colorMode.value === 'dark'" name="mdi:white-balance-sunny" class="h-4 w-4" />
                      <Icon v-else name="mdi:weather-night" class="h-4 w-4" />
                    </Button>
                    <Button variant="outline" class="flex-1" @click="handleLogout">
                      <Icon name="mdi:logout" class="mr-2 h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <!-- User Menu Desktop -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" class="relative h-9 w-9 rounded-full">
                <Avatar class="h-9 w-9 border cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                  <AvatarImage :src="userAvatar" alt="Foto de Perfil" />
                  <AvatarFallback class="bg-primary/10 text-primary font-bold">
                    {{ userInitials }}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent class="w-56" align="end">
              <DropdownMenuLabel class="font-normal">
                <div class="flex flex-col space-y-1">
                  <p class="text-sm font-medium leading-none">{{ userName }}</p>
                  <p class="text-xs leading-none text-muted-foreground">
                    {{ user?.email }}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="router.push('/configuracoes')" class="cursor-pointer">
                <Icon name="mdi:cog" class="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="handleLogout" class="text-red-600 focus:text-red-600 cursor-pointer">
                <Icon name="mdi:logout" class="mr-2 h-4 w-4" />
                Sair do Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 pt-8 pb-6 lg:pt-10 lg:pb-8 relative z-10">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t bg-muted/30 relative z-10">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>Controle Financeiro - Gerencie suas financas com facilidade</p>
          <p>{{ new Date().getFullYear() }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>
