export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  // Lista de rotas públicas (onde o utilizador PODE entrar sem estar logado)
  const publicRoutes = ['/login']

  // Se a URL tem código de callback OAuth, deixa passar para processar
  if (to.query.code) {
    return
  }

  // Se não tem user, tenta recuperar a sessão primeiro
  if (!user.value) {
    const { data } = await supabase.auth.getSession()

    // Se conseguiu recuperar sessão e está indo para login, redireciona para home
    if (data.session && publicRoutes.includes(to.path)) {
      return navigateTo('/')
    }

    // Se não tem sessão e não é rota pública, vai para login
    if (!data.session && !publicRoutes.includes(to.path)) {
      return navigateTo('/login')
    }

    return
  }

  // CASO 1: Utilizador NÃO logado tentando acessar área restrita
  if (!user.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  // CASO 2: Utilizador JÁ logado tentando acessar página de login
  if (user.value && publicRoutes.includes(to.path)) {
    return navigateTo('/')
  }
})