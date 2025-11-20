<template>
  <div class="min-h-screen flex items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex items-center space-x-2">
          <Icon name="mdi:github" class="w-6 h-6" />
          <h2>Github Authorization</h2>
        </div>
      </template>
      
      <div v-if="loading" class="text-center py-8">
        <Icon name="svg-spinners:180-ring-with-bg" class="w-8 h-8 mx-auto" />
        <p class="mt-2 text-sm text-gray-600">Processing authorization...</p>
      </div>
      
      <div v-else-if="error" class="text-center py-4">
        <UAlert color="error" variant="subtle" :title="error" />
        <UButton @click="closePopup" class="mt-4 w-full" color="primary" variant="subtle">Close</UButton>
      </div>
      
      <div v-else class="text-center py-4">
        <UAlert color="success" variant="subtle" title="Authorization successful!" />
        <p class="text-sm text-muted mt-2">Closing window...</p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { $client } = useNuxtApp()

const loading = ref(true)
const error = ref<string | null>(null)

const closePopup = () => {
  if (window.opener) {
    window.close()
  }
}

onMounted(async () => {
  if (!process.client) return
  
  const { $posthog } = useNuxtApp();
  
  try {
    const query = route.query
    
    if (query.installation_id && query.setup_action === 'install' && query.code) {
      $posthog().capture('github_app_installation_started', {
        installation_id: query.installation_id
      });
      
      const response = await $client.github.handleAppInstallationFlow.query({
        installation_id: Number(query.installation_id as string)
      })
      
      if (response) {
        $posthog().capture('github_app_installation_success', {
          installation_id: query.installation_id
        });
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'GITHUB_INSTALLATION_SUCCESS',
            data: response
          }, window.location.origin)
        }
        setTimeout(closePopup, 1500)
      } else {
        throw new Error('Installation failed')
      }
    } else if (query.code && query.state) {
      $posthog().capture('github_oauth_started');
      
      const response = await $client.github.handleOAuthFlow.mutate({
        code: query.code as string
      })
      
      if (response?.user_access_token) {
        $posthog().capture('github_oauth_completed', {
          success: true
        });
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'GITHUB_OAUTH_SUCCESS',
            data: response.user_access_token
          }, window.location.origin)
        }
        setTimeout(closePopup, 1500)
      } else {
        throw new Error('OAuth failed')
      }
    } else {
      throw new Error('Invalid authorization parameters')
    }
  } catch (err: any) {
    $posthog().capture('github_flow_failed', {
      error: err.message
    });
    error.value = err.message || 'Authorization failed'
  } finally {
    loading.value = false
  }
})
</script>
