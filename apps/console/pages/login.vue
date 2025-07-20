<script setup lang="ts">
// import Brand from '~/assets/icons/thunder.svg?skipsvgo';

definePageMeta({
  type: "default",
  title: "Login",
  middleware: [
    function(to, from) {
        const user = useSupabaseUser();
        // console.log(user.value);
        if (user.value) {
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

<template>
<div>
<ClientOnly>
    <div class="bg-background text-foreground flex flex-col pt-8 pb-8">
        <header class="flex justify-between items-center">
            <div class="text-muted-foreground flex items-center">
                <a href="https://thunder.so">
                    <Icon name="uil:arrow-left" class="mr-2 h-4 w-4" />
                    Back to home
                </a>
            </div>
        </header>
    </div>

    <main class="flex-grow flex items-center justify-center mt-20">
        <div class="w-full grid gap-12 lg:grid-cols-[2fr,1fr]">
          <div class="space-y-6">
            <div class="space-y-2">
                <div class="flex space-between mb-1">
                    <!-- <Brand class="w-6 mr-2" /> -->
                    <h3>thunder</h3>
                </div>
              <h1 class="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl pt-4 pb-4">
                You're one step away from deploying on
                <span class="text-primary">AWS</span>
              </h1>
              <p class="text-muted-foreground">Free for SPA and SSG.</p>
            </div>
            <ul class="space-y-2">
              <li class="flex items-center">
                <Icon name="uil:check" class="h-4 w-4 mr-2 text-primary" />
                Deployments on AWS made so easy that anyone can do it.
              </li>
              <li class="flex items-center">
                <Icon name="uil:check" class="h-4 w-4 mr-2 text-primary" />
                Works with any framework.
              </li>
              <li class="flex items-center">
                <Icon name="uil:check" class="h-4 w-4 mr-2 text-primary" />
                Simple workflow with git push to deploy.
              </li>
            </ul>
            
            <p class="text-sm text-muted-foreground">
              By signing up, you agree to our
              <NuxtLink to="https://thunder.so/terms" class="text-primary hover:underline">Terms of Service</NuxtLink>.
            </p>
          </div>
          <div class="space-y-4">
            <div class="w-full rounded-lg shadow border md:mt-0 sm:max-w-md xl:p-0 bg-card border-border">
                <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
                    <div v-if="!sent">
                        <p class="text-muted-foreground">Get a magic link sent to your email to login or sign-up.</p>
                        <UForm :state="state" @submit.prevent="signInWithMagicLink" class="space-y-4 mt-4">
                            <div>
                                <label for="email" class="block mb-2 text-sm font-medium">Your email</label>
                                <UInput v-model="state.email" type="email" id="email" placeholder="name@company.com" required />
                            </div>
                            <UButton type="submit" label="Send Magic Link" :loading="loading" class="w-full" />
                        </UForm>
                        <USeparator label="OR" class="my-4" />
                        <UButton @click="signInWithGithub" label="Continue with Github" class="w-full" icon="i-uil-github" variant="outline" />
                    </div>
                    <div v-else>
                        <p class="text-center">Magic link sent to <strong>{{ state.email }}</strong>. Check your inbox and click the link to login.</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </main>
</ClientOnly>
</div>
</template>

<!-- <style scoped>
.agree a {
    @apply text-gray-600 hover:text-gray-500;
}
</style> -->