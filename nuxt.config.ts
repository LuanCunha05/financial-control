import tailwindcss from '@tailwindcss/vite'
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],
  typescript: {
    strict: true,
    typeCheck: false
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  modules: [
    'shadcn-nuxt',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/supabase',
    '@nuxtjs/color-mode',
  ],
  colorMode: {
    classSuffix: '',
  },
  shadcn: {
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
    componentDir: '@/components/ui'
  },
  // Configuração Supabase
  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login'],
    }
  },

  // Configuração Pinia
  pinia: {
    storesDirs: ['./stores/**'],
  },

  app: {
    head: {
      title: 'Controle Financeiro',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Sistema completo de controle financeiro pessoal' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  }
})
