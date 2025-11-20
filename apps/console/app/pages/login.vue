<template>
<div>
  <div class="min-h-screen flex items-center justify-center">
    <div class="flex flex-col items-center">
      <div class="flex items-center mb-6">
        <Icon name="custom:thunder" class="h-6 w-6 mr-2" />
        <h3>thunder</h3>
      </div>
      
      <UCard>
        <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
          <div v-if="!sent">
            <p class="text-muted-foreground">Get a magic link sent to your email.</p>
            <UForm :state="state" @submit.prevent="signInWithMagicLink" class="space-y-4 mt-4">
              <div>
                <label for="email" class="block mb-2 text-sm font-medium"></label>
                <UInput v-model="state.email" size="lg" type="email" id="email" placeholder="name@company.com" required class="w-full" />
              </div>
              <UButton type="submit" label="Send Magic Link" :loading="loading" class="w-full" />
            </UForm>
            <USeparator label="OR" class="my-4" />
            <UButton @click="signInWithGithub" label="Continue with Github" size="lg" class="w-full" icon="i-uil-github" variant="outline" />
          </div>
          <div v-else>
            <p class="text-center">Magic link sent to <strong>{{ state.email }}</strong>. Check your inbox and click the link to login.</p>
          </div>
        </div>
      </UCard>

      <div>
        <p class="text-sm text-muted-foreground mt-4">
          By signing up, you agree to our
          <NuxtLink to="https://thunder.so/terms" class="text-primary hover:underline">Terms of Service</NuxtLink>.
        </p>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
definePageMeta({
  type: "default",
  title: "Login",
  middleware: [
    function(to, from) {
        const user = useSupabaseUser();
        if (user.value?.sub) {
            return navigateTo({ path: '/' });
        }
    }
  ]
});

const supabase = useSupabaseClient()
const base = ref('')
const state = reactive({
    email: ''
})
const loading = ref(false)
const sent = ref(false)

// @ts-ignore
if (process.client) {
    base.value = window.location.origin
}

const signInWithMagicLink = async () => {
    if (!state.email) return

    loading.value = true
    const { error } = await supabase.auth.signInWithOtp({
        email: state.email,
        options: {
            emailRedirectTo: `${base.value}/confirm`,
        },
    })
    loading.value = false
    if (error) {
        console.error('Error sending magic link:', error)
        // maybe show an error toast
    } else {
        sent.value = true
    }
}

const signInWithGithub = async() => {
    const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider: 'github',
        options: {
            scopes: '',
            redirectTo: `${base.value}/confirm`
        }
    })
    if (error) console.error(error)
}
</script>