<script setup lang="ts">
import { ref, computed } from 'vue'
import AlertDialog from '~/components/ui/alert-dialog/AlertDialog.vue'
import AlertDialogAction from '~/components/ui/alert-dialog/AlertDialogAction.vue'
import AlertDialogContent from '~/components/ui/alert-dialog/AlertDialogContent.vue'
import AlertDialogDescription from '~/components/ui/alert-dialog/AlertDialogDescription.vue'
import AlertDialogFooter from '~/components/ui/alert-dialog/AlertDialogFooter.vue'
import AlertDialogHeader from '~/components/ui/alert-dialog/AlertDialogHeader.vue'
import AlertDialogTitle from '~/components/ui/alert-dialog/AlertDialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Slider from '~/components/ui/slider/Slider.vue'
import Switch from '~/components/ui/switch/Switch.vue'
import Tabs from '~/components/ui/tabs/Tabs.vue'
import TabsContent from '~/components/ui/tabs/TabsContent.vue'
import TabsList from '~/components/ui/tabs/TabsList.vue'
import TabsTrigger from '~/components/ui/tabs/TabsTrigger.vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const colorMode = useColorMode()
const { settings, updateSettings } = useSettings()

// Estado do perfil
const profileName = ref('')
const profileEmail = computed(() => user.value?.email || '')
const isSavingProfile = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarPreview = ref<string | null>(null)
const isUploadingAvatar = ref(false)

// Estado de confirmação
const showSaveConfirm = ref(false)
const confirmMessage = ref('')

// Input de arquivo oculto
const backgroundInput = ref<HTMLInputElement | null>(null)

// Preview da imagem
const backgroundPreview = ref<string | null>(null)

// Dark Mode
const isDarkMode = computed({
  get: () => colorMode.preference === 'dark',
  set: (value) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
})

// Cores de destaque
const accentColors = [
  { id: 'blue', name: 'Azul', class: 'bg-blue-600' },
  { id: 'green', name: 'Verde', class: 'bg-green-600' },
  { id: 'purple', name: 'Roxo', class: 'bg-purple-600' },
  { id: 'red', name: 'Vermelho', class: 'bg-red-600' },
  { id: 'orange', name: 'Laranja', class: 'bg-orange-600' },
  { id: 'pink', name: 'Rosa', class: 'bg-pink-600' },
]

// Carregar dados ao montar
onMounted(() => {
  // Carregar nome do perfil
  profileName.value = settings.value.displayName || ''

  // Carregar preview da imagem de background
  if (settings.value.backgroundUrl) {
    backgroundPreview.value = settings.value.backgroundUrl
  }

  // Carregar preview do avatar
  if (settings.value.avatarUrl) {
    avatarPreview.value = settings.value.avatarUrl
  }

  console.log('🔵 [CONFIG] Configurações atuais:', settings.value)
})

// Upload de avatar
const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Validar tipo
  if (!file.type.startsWith('image/')) {
    confirmMessage.value = 'Por favor, selecione uma imagem válida'
    showSaveConfirm.value = true
    return
  }

  // Validar tamanho (máx 5MB)
  if (file.size > 5 * 1024 * 1024) {
    confirmMessage.value = 'A imagem deve ter no máximo 5MB'
    showSaveConfirm.value = true
    return
  }

  isUploadingAvatar.value = true

  try {
    // Upload para Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.value?.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Gerar URL pública assinada
    const { data: urlData } = await supabase.storage
      .from('avatars')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10) // 10 anos

    if (!urlData?.signedUrl) {
      throw new Error('Não foi possível gerar URL do avatar')
    }

    avatarPreview.value = urlData.signedUrl
    await updateSettings({ avatarUrl: urlData.signedUrl })

    confirmMessage.value = 'Avatar atualizado com sucesso!'
    showSaveConfirm.value = true
  } catch (error: any) {
    confirmMessage.value = 'Erro ao fazer upload do avatar: ' + error.message
    showSaveConfirm.value = true
  } finally {
    isUploadingAvatar.value = false
    if (target) target.value = ''
  }
}

// Remover avatar
const removeAvatar = async () => {
  avatarPreview.value = null
  await updateSettings({ avatarUrl: null })

  confirmMessage.value = 'Avatar removido com sucesso!'
  showSaveConfirm.value = true
}

// Salvar perfil (nome)
const saveProfile = async () => {
  isSavingProfile.value = true
  try {
    await updateSettings({ displayName: profileName.value })

    confirmMessage.value = 'Nome atualizado com sucesso!'
    showSaveConfirm.value = true
  } catch (error: any) {
    confirmMessage.value = 'Erro ao salvar perfil: ' + error.message
    showSaveConfirm.value = true
  } finally {
    isSavingProfile.value = false
  }
}

// Upload de imagem de background
const handleBackgroundUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Validar tipo
  if (!file.type.startsWith('image/')) {
    confirmMessage.value = 'Por favor, selecione uma imagem válida'
    showSaveConfirm.value = true
    return
  }

  // Validar tamanho (máx 10MB)
  if (file.size > 10 * 1024 * 1024) {
    confirmMessage.value = 'A imagem deve ter no máximo 10MB'
    showSaveConfirm.value = true
    return
  }

  // Criar preview
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    backgroundPreview.value = dataUrl

    console.log('🔵 [CONFIG] Salvando background...')
    updateSettings({
      backgroundUrl: dataUrl,
      showBackground: true
    })

    confirmMessage.value = 'Background atualizado com sucesso!'
    showSaveConfirm.value = true
  }
  reader.readAsDataURL(file)

  // Limpar input
  target.value = ''
}

// Remover background
const removeBackground = () => {
  backgroundPreview.value = null
  updateSettings({
    backgroundUrl: null,
    showBackground: false
  })

  confirmMessage.value = 'Background removido com sucesso!'
  showSaveConfirm.value = true
}

// Atualizar visibilidade do background
const toggleShowBackground = (value: boolean) => {
  console.log('🔵 [CONFIG] Alterando visibilidade do background:', value)
  updateSettings({ showBackground: value })
}

// Atualizar opacidade
const updateOpacity = (value: number[] | undefined) => {
  if (value && value.length > 0) {
    console.log('🔵 [CONFIG] Alterando opacidade:', value[0])
    updateSettings({ backgroundOpacity: value[0] })
  }
}

// Atualizar cor de destaque
const updateAccentColor = (colorId: string) => {
  console.log('🔵 [CONFIG] Alterando cor de destaque:', colorId)
  updateSettings({ accentColor: colorId })
  confirmMessage.value = 'Cor de destaque aplicada com sucesso! Navegue pela aplicação para ver as mudanças.'
  showSaveConfirm.value = true
}
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Conteúdo principal -->
    <div class="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
      <div class="mb-8">
        <h1 class="text-3xl font-bold tracking-tight mb-2">Configurações</h1>
        <p class="text-muted-foreground">Personalize sua experiência</p>
      </div>

      <Tabs default-value="perfil" class="w-full">
        <TabsList class="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="perfil">
            <Icon name="mdi:account-circle" class="mr-2 h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="aparencia">
            <Icon name="mdi:palette" class="mr-2 h-4 w-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="background">
            <Icon name="mdi:image" class="mr-2 h-4 w-4" />
            Background
          </TabsTrigger>
        </TabsList>

        <!-- Aba Perfil -->
        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <!-- Avatar e Upload -->
              <div class="flex items-center gap-6">
                <div class="relative">
                  <input
                    ref="avatarInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleAvatarUpload"
                  />

                  <div
                    v-if="avatarPreview"
                    class="relative h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 group cursor-pointer"
                    @click="avatarInput?.click()"
                  >
                    <img
                      :src="avatarPreview"
                      alt="Avatar"
                      class="w-full h-full object-cover"
                    />
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Icon v-if="!isUploadingAvatar" name="mdi:camera" class="h-8 w-8 text-white" />
                      <Icon v-else name="mdi:loading" class="h-8 w-8 text-white animate-spin" />
                    </div>
                  </div>

                  <button
                    v-else
                    @click="avatarInput?.click()"
                    class="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors border-2 border-dashed border-primary/30"
                    :disabled="isUploadingAvatar"
                  >
                    <Icon v-if="!isUploadingAvatar" name="mdi:camera-plus" class="h-12 w-12 text-primary" />
                    <Icon v-else name="mdi:loading" class="h-12 w-12 text-primary animate-spin" />
                  </button>

                  <Button
                    v-if="avatarPreview"
                    variant="destructive"
                    size="icon"
                    class="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                    @click="removeAvatar"
                  >
                    <Icon name="mdi:close" class="h-4 w-4" />
                  </Button>
                </div>

                <div class="flex-1">
                  <h3 class="font-semibold text-lg">{{ profileName || 'Usuário' }}</h3>
                  <p class="text-sm text-muted-foreground">{{ profileEmail }}</p>
                  <p class="text-xs text-muted-foreground mt-1">
                    Clique no avatar para alterar
                  </p>
                </div>
              </div>

              <Separator />

              <div class="space-y-4">
                <div class="space-y-2">
                  <Label for="name">Nome de exibição</Label>
                  <Input
                    id="name"
                    v-model="profileName"
                    placeholder="Digite seu nome"
                  />
                  <p class="text-xs text-muted-foreground">
                    Este nome será exibido no dashboard e outros locais do sistema
                  </p>
                </div>

                <div class="space-y-2">
                  <Label for="email">Email</Label>
                  <Input
                    id="email"
                    :value="profileEmail"
                    disabled
                    class="bg-muted"
                  />
                  <p class="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button @click="saveProfile" :disabled="isSavingProfile">
                <Icon v-if="!isSavingProfile" name="mdi:content-save" class="mr-2 h-4 w-4" />
                <Icon v-else name="mdi:loading" class="mr-2 h-4 w-4 animate-spin" />
                {{ isSavingProfile ? 'Salvando...' : 'Salvar Perfil' }}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <!-- Aba Aparência -->
        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Tema e Cores</CardTitle>
              <CardDescription>Personalize a aparência da aplicação</CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <!-- Dark Mode Toggle -->
              <div class="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div class="space-y-0.5">
                  <Label class="text-base font-semibold">Modo Escuro</Label>
                  <p class="text-sm text-muted-foreground">
                    Ative o tema escuro para reduzir o brilho da tela
                  </p>
                </div>
                <Switch
                  :checked="isDarkMode"
                  @update:checked="isDarkMode = $event"
                />
              </div>

              <Separator />

              <!-- Cor de destaque -->
              <div class="space-y-4">
                <div>
                  <Label class="text-base font-semibold">Cor de Destaque</Label>
                  <p class="text-sm text-muted-foreground mb-4">
                    Escolha a cor principal da interface
                  </p>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <button
                    v-for="color in accentColors"
                    :key="color.id"
                    @click="updateAccentColor(color.id)"
                    class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:scale-105"
                    :class="settings.accentColor === color.id ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2' : 'border-border hover:border-primary/50'"
                  >
                    <div :class="[color.class, 'h-12 w-12 rounded-full']" />
                    <span class="text-sm font-medium">{{ color.name }}</span>
                    <Icon
                      v-if="settings.accentColor === color.id"
                      name="mdi:check-circle"
                      class="h-5 w-5 text-primary"
                    />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Aba Background -->
        <TabsContent value="background">
          <div class="space-y-6">
            <!-- Background -->
            <Card>
              <CardHeader>
                <div class="flex items-center justify-between">
                  <div>
                    <CardTitle>Background da Aplicação</CardTitle>
                    <CardDescription>Personalize o plano de fundo de todas as páginas</CardDescription>
                  </div>
                  <Switch
                    :checked="settings.showBackground"
                    @update:checked="toggleShowBackground"
                    :disabled="!backgroundPreview"
                  />
                </div>
              </CardHeader>
              <CardContent class="space-y-4">
                <input
                  ref="backgroundInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleBackgroundUpload"
                />

                <div
                  v-if="backgroundPreview"
                  class="relative rounded-lg border overflow-hidden aspect-video bg-muted"
                >
                  <img
                    :src="backgroundPreview"
                    alt="Background"
                    class="w-full h-full object-cover"
                  />
                  <div class="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      @click="backgroundInput?.click()"
                    >
                      <Icon name="mdi:image-edit" class="mr-2 h-4 w-4" />
                      Trocar Imagem
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      @click="removeBackground"
                    >
                      <Icon name="mdi:delete" class="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>

                <Button
                  v-else
                  variant="outline"
                  class="w-full h-32 border-dashed"
                  @click="backgroundInput?.click()"
                >
                  <div class="flex flex-col items-center gap-2">
                    <Icon name="mdi:image-plus" class="h-8 w-8" />
                    <span class="font-medium">Adicionar Imagem de Background</span>
                    <span class="text-xs text-muted-foreground">Clique para selecionar</span>
                  </div>
                </Button>

                <div class="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                  <p class="font-medium">💡 Dica:</p>
                  <p class="text-muted-foreground">
                    Use imagens de alta resolução (1920x1080 ou maior) para melhor qualidade.
                    O background será aplicado em todas as páginas da aplicação.
                  </p>
                </div>

                <p class="text-xs text-muted-foreground">
                  Tamanho máximo: 10MB • Formatos: JPG, PNG, GIF, WebP
                </p>
              </CardContent>
            </Card>

            <!-- Opacidade -->
            <Card v-if="backgroundPreview">
              <CardHeader>
                <CardTitle>Opacidade do Background</CardTitle>
                <CardDescription>Ajuste a transparência do plano de fundo</CardDescription>
              </CardHeader>
              <CardContent class="space-y-6">
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <Label class="text-base">Transparência</Label>
                    <Badge variant="secondary" class="text-base font-semibold px-3">
                      {{ settings.backgroundOpacity }}%
                    </Badge>
                  </div>
                  <Slider
                    :model-value="[settings.backgroundOpacity]"
                    @update:model-value="updateOpacity"
                    :min="0"
                    :max="100"
                    :step="5"
                    class="w-full"
                  />
                  <div class="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div class="text-left">0% - Invisível</div>
                    <div class="text-center">50% - Médio</div>
                    <div class="text-right">100% - Opaco</div>
                  </div>
                  <p class="text-sm text-muted-foreground">
                    Valores entre 10-30% mantêm o fundo sutil e profissional
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <!-- Debug Info (apenas em desenvolvimento) -->
      <Card v-if="false" class="mt-6">
        <CardHeader>
          <CardTitle>Debug - Estado Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <pre class="text-xs bg-muted p-4 rounded overflow-auto">{{ JSON.stringify(settings, null, 2) }}</pre>
        </CardContent>
      </Card>
    </div>

    <!-- Alert Dialog de Confirmação -->
    <AlertDialog :open="showSaveConfirm" @update:open="showSaveConfirm = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <div class="flex items-center gap-2">
              <Icon name="mdi:check-circle" class="h-5 w-5 text-green-600" />
              Confirmação
            </div>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{ confirmMessage }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction @click="showSaveConfirm = false">
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
