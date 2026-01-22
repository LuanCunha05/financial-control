export default defineNuxtPlugin(() => {
  const { settings } = useSettings()

  // Mapeamento de cores com valores OKLCH
  const colorMap: Record<string, { light: string; dark: string }> = {
    blue: {
      light: 'oklch(0.55 0.22 264)', // Azul vibrante
      dark: 'oklch(0.70 0.20 264)'   // Azul claro para dark mode
    },
    green: {
      light: 'oklch(0.55 0.20 142)', // Verde vibrante
      dark: 'oklch(0.65 0.18 142)'   // Verde claro para dark mode
    },
    purple: {
      light: 'oklch(0.58 0.24 300)', // Roxo vibrante
      dark: 'oklch(0.70 0.22 300)'   // Roxo claro para dark mode
    },
    red: {
      light: 'oklch(0.55 0.22 27)',  // Vermelho vibrante
      dark: 'oklch(0.65 0.20 27)'    // Vermelho claro para dark mode
    },
    orange: {
      light: 'oklch(0.65 0.20 70)',  // Laranja vibrante
      dark: 'oklch(0.75 0.18 70)'    // Laranja claro para dark mode
    },
    pink: {
      light: 'oklch(0.65 0.22 350)', // Rosa vibrante
      dark: 'oklch(0.75 0.20 350)'   // Rosa claro para dark mode
    }
  }

  // Função para aplicar o tema
  const applyTheme = (colorId: string, isDark: boolean) => {
    const root = document.documentElement
    const colors = colorMap[colorId]

    if (!colors) {
      console.warn('⚠️ [THEME] Cor não encontrada:', colorId)
      return
    }

    const primaryColor = isDark ? colors.dark : colors.light

    // Cor do texto sobre a cor primária (sempre branco)
    const primaryForeground = 'oklch(0.984 0.003 247.858)'

    console.log('🎨 [THEME] Aplicando cor:', {
      color: colorId,
      mode: isDark ? 'dark' : 'light',
      primary: primaryColor
    })

    // Aplicar cor primária
    root.style.setProperty('--primary', primaryColor)
    root.style.setProperty('--primary-foreground', primaryForeground)

    // Aplicar na sidebar também
    root.style.setProperty('--sidebar-primary', primaryColor)
    root.style.setProperty('--sidebar-primary-foreground', primaryForeground)

    // Aplicar no ring (foco)
    root.style.setProperty('--ring', primaryColor)
    root.style.setProperty('--sidebar-ring', primaryColor)

    // Aplicar nas cores dos gráficos
    root.style.setProperty('--chart-1', primaryColor)
    root.style.setProperty('--chart-2', isDark ? 'oklch(0.696 0.17 162.48)' : 'oklch(0.6 0.118 184.704)')
    root.style.setProperty('--chart-3', 'oklch(0.769 0.188 70.08)')
    root.style.setProperty('--chart-4', isDark ? 'oklch(0.627 0.265 303.9)' : 'oklch(0.398 0.07 227.392)')
    root.style.setProperty('--chart-5', 'oklch(0.645 0.246 16.439)')
  }

  // Observar mudanças na cor selecionada
  watch(
    () => settings.value.accentColor,
    (newColor) => {
      const colorMode = useColorMode()
      const isDark = colorMode.value === 'dark'
      console.log('🔄 [THEME] Mudança de cor detectada:', newColor)
      applyTheme(newColor, isDark)
    }
  )

  // Observar mudanças no modo escuro/claro
  const colorMode = useColorMode()
  watch(
    () => colorMode.value,
    (newMode) => {
      const isDark = newMode === 'dark'
      console.log('🔄 [THEME] Mudança de modo detectada:', newMode)
      applyTheme(settings.value.accentColor, isDark)
    }
  )

  // Aplicar tema inicial
  if (typeof window !== 'undefined') {
    nextTick(() => {
      const isDark = colorMode.value === 'dark'
      console.log('🚀 [THEME] Aplicando tema inicial:', {
        color: settings.value.accentColor,
        mode: isDark ? 'dark' : 'light'
      })
      applyTheme(settings.value.accentColor, isDark)
    })
  }
})
