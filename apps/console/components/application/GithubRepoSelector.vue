<template>
  <div>
    <h2>Select a repository</h2>
    <div class="grid grid-cols-3 gap-4">
      <div class="selector col-span-2">
        <div class="flex items-center space-between space-x-2 mt-4 mb-4">
          <USelect 
            v-model="selectedInstallation" 
            :items="installationItems" 
            value-key="value" 
            :avatar="selectedAvatar" 
            trailing-icon="mdi:chevron-down"
            size="lg"
            class="w-48" 
          />

          <UInput
            type="text"
            v-model="searchQuery"
            placeholder="Search repositories..."
            size="lg"
            class="w-full"
          />
        </div>
        <div v-if="pendingRepositories">Loading repositories...</div>
        <div v-else class="repo-list">
          <div 
            v-for="repo in filteredRepositories" 
            :key="repo.id"
            class="flex items-center justify-between p-3 border border-muted rounded-md"
          >
            <div class="repo-info">
              <img :src="repo.owner.avatar_url" alt="Repository owner" class="repo-avatar" />
              <span class="repo-name">{{ repo.owner.login }} / {{ repo.name }}</span>
            </div>
            <UButton size="md" color="primary" variant="outline" @click="selectRepository(repo, repo.installationId)">Select</UButton>
          </div>
        </div>
      </div>

      <div>
        <div class="p-4 rounded-md">
          <h3 class="text-md font-semibold mt-1 mb-4">Connected Github accounts</h3>
          <div v-for="inst in installations" :key="inst.id" class="flex items-center mb-3">
            <UAvatar :src="inst.metadata.account.avatar_url" :alt="inst.metadata.account.login" class="mr-3" />
            <a :href="`https://github.com/organizations/${inst.metadata.account.login}/settings/installations/${inst.installation_id}`" target="_blank" class="text-primary-500 hover:underline">
              {{ inst.metadata.account.login }}
            </a>
          </div>
          <UButton
            variant="subtle"
            icon="i-uil-github"
            size="lg"
            :to="githubInstallUrl"
            label="Import repositories"
            external
            class="mt-4 w-full"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import type { SelectItem } from '@nuxt/ui';

const { $client } = useNuxtApp();
const config = useRuntimeConfig();
// const { selectedRepo } = useNewApplicationFlow();

const githubApp = computed(() => config.public.GITHUB_APP);
const base = ref('');

if (process.client) {
    base.value = window.location.origin;
}

const githubInstallUrl = computed(() => {
  if (!githubApp.value || !base.value) return '';
  return `https://github.com/apps/${githubApp.value}/installations/new?redirect_uri=${base.value}/new`;
});

const installations = inject<any>('installations');

const allRepositories = ref<any[]>([]);
const pendingRepositories = ref(false);
const searchQuery = ref('');
const selectedInstallation = ref<string | 'all'>('all'); // Ensure type compatibility

const installationItems = computed(() => {
  return [
    { label: 'Show all', value: 'all' },
    ...installations.value.map((inst: any) => ({
      label: inst.metadata.account.login,
      value: inst.installation_id,
      avatar: {
        src: inst.metadata.account.avatar_url,
        alt: inst.metadata.account.login
      }
    }))
  ] satisfies SelectItem[];
});

const selectedAvatar = computed(() => {
  return installationItems.value.find(item => item.value === selectedInstallation.value)?.avatar;
});

const fetchAllRepositories = async () => {
  if (!installations.value || installations.value.length === 0) return;
  // console.log('Fetching all repositories...', installations.value);
  try {
    pendingRepositories.value = true;
    const installationIds = installations.value.map((inst: any) => inst.installation_id);
    const result = await $client.github.getInstallationRepositories.query({
      installation_ids: installationIds
    });
    
    // Transform the key/value object into a flat array with installationId added to each repo
    const repos: any[] = [];
    Object.entries(result).forEach(([installationId, repositories]) => {
      repositories.forEach(repo => {
        repos.push({
          ...repo,
          installationId: Number(installationId)
        });
      });
    });
    
    allRepositories.value = repos;
    pendingRepositories.value = false;
  } catch (error) {
    console.error('Error fetching repositories:', error);
    pendingRepositories.value = false;
  }
};

const filteredRepositories = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return allRepositories.value.filter(repo => {
    const matchesQuery = repo.full_name.toLowerCase().includes(query);
    const matchesInstallation = selectedInstallation.value === 'all' || repo.installationId === selectedInstallation.value;
    return matchesQuery && matchesInstallation;
  });
});

const emit = defineEmits(['selected']);

const selectRepository = (repo: any, installationId: number) => {
  // setRepo({ ...repo, installationId });
  emit('selected', {
    owner: repo.owner?.login || repo.owner,
    repo,
    installationId,
    type: repo.stack_type || undefined
  });
};

watch(installations, (newInstallations) => {
  if (newInstallations && newInstallations.length > 0) {
    fetchAllRepositories();
  }
}, { immediate: true });

selectedInstallation.value = 'all'; // Default to 'Show all'
</script>

<style scoped>
.repo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.repo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.repo-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.repo-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.repo-name {
  font-weight: 500;
}
</style>
