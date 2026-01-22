<script setup lang="ts">
const store = useFinanceiroStore()
const user = useSupabaseUser()

// Carregar dados quando usuário logar
watch(user, async (newUser) => {
  if (newUser) {
    await store.carregarDados()
  }
}, { immediate: true })
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
