/**
 * Composable para gerenciar configurações globais da aplicação
 * Sincroniza com Supabase e localStorage
 */
export interface AppSettings {
  // Background
  backgroundUrl: string | null
  showBackground: boolean
  backgroundOpacity: number

  // Tema
  accentColor: string

  // Perfil
  avatarUrl: string | null
  displayName: string | null
}

// Tipo para a tabela user_settings do Supabase
interface UserSettingsDB {
  id?: string
  user_id: string
  accent_color: string
  background_url: string | null
  show_background: boolean
  background_opacity: number
  avatar_url: string | null
  display_name: string | null
  created_at?: string
  updated_at?: string
}

const STORAGE_KEY = 'app-settings'

const defaultSettings: AppSettings = {
  backgroundUrl: null,
  showBackground: false,
  backgroundOpacity: 20,
  accentColor: 'blue',
  avatarUrl: null,
  displayName: null
}

export function useSettings() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // Função para carregar do localStorage
  const loadFromStorage = (): AppSettings => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          console.log('✅ [SETTINGS] Configurações carregadas do localStorage:', parsed)
          return { ...defaultSettings, ...parsed }
        }
      } catch (error) {
        console.error('❌ [SETTINGS] Erro ao carregar do localStorage:', error)
      }
    }
    return defaultSettings
  }

  // Estado reativo global
  const settings = useState<AppSettings>('app-settings', loadFromStorage)

  // Função para salvar no localStorage
  const saveToStorage = (newSettings: AppSettings) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
        console.log('✅ [SETTINGS] Configurações salvas no localStorage')
      } catch (error) {
        console.error('❌ [SETTINGS] Erro ao salvar no localStorage:', error)
      }
    }
  }

  // Função para carregar do Supabase
  const loadFromSupabase = async () => {
    if (!user.value?.id) {
      console.log('⚠️ [SETTINGS] Usuário não autenticado')
      return
    }

    try {
      console.log('🔵 [SETTINGS] Carregando do Supabase...')
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.value.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Registro não encontrado, criar um novo
          console.log('ℹ️ [SETTINGS] Configurações não encontradas, criando padrão...')
          await saveToSupabase(settings.value)
          return
        }
        throw error
      }

      if (data) {
        const dbData = data as unknown as UserSettingsDB
        const loadedSettings: AppSettings = {
          backgroundUrl: dbData.background_url,
          showBackground: dbData.show_background,
          backgroundOpacity: dbData.background_opacity,
          accentColor: dbData.accent_color,
          avatarUrl: dbData.avatar_url,
          displayName: dbData.display_name
        }

        settings.value = loadedSettings
        saveToStorage(loadedSettings)
        console.log('✅ [SETTINGS] Configurações carregadas do Supabase:', loadedSettings)
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Erro ao carregar do Supabase:', error)
    }
  }

  // Função para salvar no Supabase
  const saveToSupabase = async (newSettings: AppSettings) => {
    if (!user.value?.id) {
      console.warn('⚠️ [SETTINGS] Usuário não autenticado, salvando apenas no localStorage')
      return
    }

    try {
      console.log('🔵 [SETTINGS] Salvando no Supabase...')

      const dataToSave: Omit<UserSettingsDB, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.value.id,
        accent_color: newSettings.accentColor,
        background_url: newSettings.backgroundUrl,
        show_background: newSettings.showBackground,
        background_opacity: newSettings.backgroundOpacity,
        avatar_url: newSettings.avatarUrl,
        display_name: newSettings.displayName
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert(dataToSave as any, {
          onConflict: 'user_id'
        })

      if (error) throw error
      console.log('✅ [SETTINGS] Configurações salvas no Supabase')
    } catch (error) {
      console.error('❌ [SETTINGS] Erro ao salvar no Supabase:', error)
    }
  }

  // Função para atualizar configurações
  const updateSettings = async (partial: Partial<AppSettings>) => {
    console.log('🔵 [SETTINGS] Atualizando configurações:', partial)
    const newSettings = { ...settings.value, ...partial }
    settings.value = newSettings
    saveToStorage(newSettings)
    await saveToSupabase(newSettings)
    console.log('✅ [SETTINGS] Estado atualizado:', settings.value)
  }

  // Função para resetar configurações
  const resetSettings = async () => {
    settings.value = defaultSettings
    saveToStorage(defaultSettings)
    await saveToSupabase(defaultSettings)
  }

  // Carregar do Supabase quando o usuário estiver autenticado
  watch(
    () => user.value?.id,
    (userId) => {
      if (userId) {
        loadFromSupabase()
      }
    },
    { immediate: true }
  )

  return {
    settings: readonly(settings),
    updateSettings,
    resetSettings,
    loadFromSupabase
  }
}
