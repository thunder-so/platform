<template>
  <div class="space-y-4 max-h-[500px] flex flex-col overflow-hidden">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary" />
    </div>
    <div v-else-if="error" class="text-red-500 text-center py-20 bg-red-50 rounded-lg border border-red-100">
      <UIcon name="i-lucide-alert-circle" class="w-10 h-10 mx-auto mb-2" />
      <p class="font-medium">{{ error }}</p>
      <UButton color="primary" variant="ghost" class="mt-4" @click="fetchTree">Try Again</UButton>
    </div>
    <div v-else class="flex-1 flex flex-col overflow-hidden gap-4">
      <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Search directories..." class="w-full" size="lg" />
      <div class="flex-1 overflow-y-auto min-h-0 border border-(--ui-border) rounded-lg bg-(--ui-bg) p-2">
        <UTree 
          v-model="selectedKey"
          :items="filteredTreeItems" 
          :get-key="(item: any) => item.id"
          class="w-full"
          :default-expanded="['/']"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

const modelValue = defineModel<string>();
const props = defineProps({
  owner: { type: String, required: true },
  repo: { type: String, required: true },
  branch: { type: String, required: true },
  installationId: { type: Number, required: true }
});

const { $client } = useNuxtApp();
const loading = ref(true);
const error = ref<string | null>(null);
const directories = ref<any[]>([]);
const selectedKey = ref<string | null>(modelValue.value ?? '/');
const searchQuery = ref('');

watch(modelValue, (newValue) => { 
  if (newValue !== undefined && newValue !== selectedKey.value) {
    selectedKey.value = newValue; 
  }
});

watch(selectedKey, (newValue: any) => {
  const path = typeof newValue === 'object' && newValue !== null ? newValue.id : newValue;
  if (path !== modelValue.value) {
    modelValue.value = path ?? '/';
  }
});

const fetchTree = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await $client.github.getRepoTree.query({
      owner: props.owner,
      repo: props.repo,
      branch: props.branch,
      installation_id: props.installationId
    });
    directories.value = result;
  } catch (e: any) {
    error.value = e.message || 'Failed to load repository structure';
  } finally {
    loading.value = false;
  }
};

const treeItems = computed(() => {
  const root: any[] = [{ label: '/', path: '/', id: '/', icon: 'i-lucide-folder', children: [] }];
  const map: Record<string, any> = { '/': root[0] };
  const sortedDirs = [...directories.value].sort((a, b) => a.path.length - b.path.length);

  for (const dir of sortedDirs) {
    const parts = dir.path.split('/');
    if (parts.some((p: string) => p.startsWith('.'))) continue;
    const parentPath = parts.length === 1 ? '/' : parts.slice(0, -1).join('/');
    const item = { label: dir.label, path: dir.path, id: dir.path, icon: 'i-lucide-folder', children: [] };
    map[dir.path] = item;
    if (map[parentPath]) map[parentPath].children.push(item);
    else root.push(item);
  }
  return root;
});

const filteredTreeItems = computed(() => {
  if (!searchQuery.value) return treeItems.value;
  const filterItems = (items: any[]): any[] =>
    items.reduce((acc: any[], item: any) => {
      const children = filterItems(item.children || []);
      const matches = item.label.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                      item.path.toLowerCase().includes(searchQuery.value.toLowerCase());
      if (matches || children.length > 0) acc.push({ ...item, children, defaultExpanded: true });
      return acc;
    }, []);
  return filterItems(treeItems.value);
});

onMounted(fetchTree);
</script>
