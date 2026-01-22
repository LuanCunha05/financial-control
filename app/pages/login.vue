<script setup lang="ts">
definePageMeta({
  layout: false
})

const supabase = useSupabaseClient()
const user = useSupabaseUser() // Importante: Pegamos o estado do utilizador
const router = useRouter() // Usamos o router diretamente para redirecionar

const nome = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const mode = ref<'login' | 'signup'>('login')
const successDialogOpen = ref(false)

// --- A SOLUÇÃO MÁGICA: Observador de Estado ---
// Assim que o 'user' deixar de ser nulo (login feito), redireciona.
watchEffect(() => {
  if (user.value) {
    navigateTo('/')
  }
})

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (authError) throw authError

    // Redireciona se o login foi bem-sucedido
    if (data.user) {
      await navigateTo('/')
    }

  } catch (err: any) {
    error.value = err.message || 'Erro ao fazer login'
    loading.value = false // Só paramos o loading se der erro
  }
}

const handleSignUp = async () => {
  loading.value = true
  error.value = ''

  try {
    const { error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: { nome: nome.value }
      }
    })

    if (authError) throw authError

    successDialogOpen.value = true
    loading.value = false
    
  } catch (err: any) {
    error.value = err.message || 'Erro ao criar conta'
    loading.value = false
  }
}

const handleCloseSuccess = () => {
  successDialogOpen.value = false
  mode.value = 'login'
  nome.value = ''
  email.value = ''
  password.value = ''
}

const handleSubmit = () => {
  if (mode.value === 'login') {
    handleLogin()
  } else {
    handleSignUp()
  }
}

const handleOAuthLogin = async (provider: 'google' | 'discord') => {
  loading.value = true
  error.value = ''
  
  try {
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin, // Garante que volta para a raiz
        queryParams: {
            access_type: 'offline',
            prompt: 'consent',
        }
      }
    })
    if (authError) throw authError
  } catch (err: any) {
    error.value = err.message || `Erro ao conectar com ${provider}`
    loading.value = false
  }
}
</script>
<template>
  <div class="h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
    
    <Card class="w-full max-w-md shadow-xl border-t-4 border-t-primary">
      <CardHeader class="space-y-1 text-center">
        <div class="flex justify-center mb-2">
           <div class="p-3 bg-primary/10 rounded-full">
            <Icon name="mdi:finance" class="h-10 w-10 text-primary" />
          </div>
        </div>
        <CardTitle class="text-2xl font-bold">
          {{ mode === 'login' ? 'Bem-vindo de volta' : 'Criar Conta' }}
        </CardTitle>
        <CardDescription>
          {{ mode === 'login' ? 'Digite suas credenciais para entrar' : 'Preencha os dados para começar' }}
        </CardDescription>
      </CardHeader>
      
      <CardContent class="space-y-4">
        
        <div v-if="error" class="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
          <Icon name="mdi:alert-circle" class="h-4 w-4" />
          <span>{{ error }}</span>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          
          <div v-if="mode === 'signup'" class="space-y-2">
            <Label for="nome">Nome Completo</Label>
            <div class="relative">
                <Icon name="mdi:account" class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Input 
                  id="nome" 
                  v-model="nome" 
                  placeholder="Seu nome" 
                  class="pl-9" 
                  required
                />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="email">Email</Label>
            <div class="relative">
                <Icon name="mdi:email" class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Input 
                  id="email" 
                  type="email" 
                  v-model="email" 
                  placeholder="nome@exemplo.com" 
                  class="pl-9" 
                  required
                />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="password">Senha</Label>
            <div class="relative">
                <Icon name="mdi:lock" class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Input 
                  id="password" 
                  type="password" 
                  v-model="password" 
                  placeholder="••••••••" 
                  class="pl-9" 
                  required
                  :minlength="mode === 'signup' ? 6 : undefined"
                />
            </div>
            <p v-if="mode === 'signup'" class="text-[0.8rem] text-muted-foreground">
              Mínimo de 6 caracteres.
            </p>
          </div>

          <Button type="submit" class="w-full" :disabled="loading" size="lg">
            <Icon v-if="loading" name="mdi:loading" class="mr-2 h-4 w-4 animate-spin" />
            <Icon v-else :name="mode === 'login' ? 'mdi:login' : 'mdi:account-plus'" class="mr-2 h-4 w-4" />
            {{ mode === 'login' ? 'Entrar' : 'Criar Conta' }}
          </Button>
        </form>

        <div class="flex items-center gap-4 py-2">
            <Separator class="flex-1" />
            <span class="text-xs text-muted-foreground uppercase">Ou continue com</span>
            <Separator class="flex-1" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <Button variant="outline" @click="handleOAuthLogin('google')" :disabled="loading">
            <Icon name="logos:google-icon" class="mr-2 h-4 w-4" />
            Google
          </Button>
          
          <Button 
            class="bg-[#5865F2] hover:bg-[#4752C4] text-white" 
            @click="handleOAuthLogin('discord')" 
            :disabled="loading"
          >
            <Icon name="mdi:discord" class="mr-2 h-5 w-5" />
            Discord
          </Button>
        </div>

        <div class="text-center pt-2">
           <Button variant="link" @click="mode = mode === 'login' ? 'signup' : 'login'" class="text-muted-foreground">
             {{ mode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem conta? Faça login' }}
           </Button>
        </div>

      </CardContent>
    </Card>

    <Dialog v-model:open="successDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Icon name="mdi:check-circle" class="text-green-500 h-6 w-6" />
            Conta criada com sucesso!
          </DialogTitle>
          <DialogDescription class="pt-2">
            Enviamos um email de confirmação para <strong>{{ email }}</strong>.
            <br>
            Por favor, verifique a sua caixa de entrada (e spam) para ativar a conta.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button @click="handleCloseSuccess">Ir para Login</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </div>
</template>