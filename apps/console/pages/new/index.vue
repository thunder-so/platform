<template>
  <div>
    <div v-if="loading" class="flex justify-center items-center p-8">
      <p>Loading installations...</p>
    </div>
    <div v-else-if="error" class="flex justify-center items-center p-8">
      <UAlert color="error" variant="soft" :title="`Error loading installations: ${error.message}`" />
    </div>
    <div v-else-if="installations.length > 0">
      <ClientOnly>
        <GithubRepoSelector @selected="navigateTo('/new/configure')" />
      </ClientOnly>
    </div>
    <div v-else class="flex justify-center items-center" style="height: 50vh;">
      <UCard class="w-full max-w-lg">
        <template #header>
          <h2 class="text-xl font-semibold text-center">Connect to GitHub</h2>
        </template>
        <div class="text-center p-4">
          <p class="mb-4">You need to install the Thunder GitHub App to see your repositories.</p>
          <UButton
            icon="i-uil-github"
            size="lg"
            :to="githubInstallUrl"
            label="Install GitHub App"
            external
          />
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, provide } from 'vue';
import GithubRepoSelector from '~/components/application/GithubRepoSelector.vue';

definePageMeta({
  layout: 'new',
  middleware: ['github-middleware-client']
});

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const config = useRuntimeConfig();

const installations = ref<any[]>([]);
const loading = ref(true);
const error = ref<any>(null);

provide('installations', installations);

const githubApp = computed(() => config.public.GITHUB_APP);
const base = ref('');

if (process.client) {
    base.value = window.location.origin;
}

const githubInstallUrl = computed(() => {
  if (!githubApp.value || !base.value) return '';
  return `https://github.com/apps/${githubApp.value}/installations/new?redirect_uri=${base.value}/new`;
});

const fetchInstallations = async () => {
  if (!user.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('installations')
      .select('*')
      .eq('user_id', user.value.id)
      .is('deleted_at', null);

    if (fetchError) throw fetchError;
    installations.value = data || [];
  } catch (e: any) {
    error.value = e;
    console.error('Error fetching installations:', e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchInstallations();
});
</script>
