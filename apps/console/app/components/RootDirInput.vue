<template>
  <div class="flex items-center gap-2 w-96">
    <UInput
      v-model="inputValue"
      placeholder="/"
      class="flex-1"
      size="lg"
      @blur="onBlur"
    />
    <UButton
      v-if="resolvedOwner"
      icon="i-lucide-folder-open"
      color="neutral"
      variant="subtle"
      size="lg"
      @click="isOpen = true"
    />

    <UModal v-model:open="isOpen" title="Select Root Directory" description="Browse your repository to select the root directory for this service.">
      <template #body>
        <MonorepoDirSelector
          v-if="resolvedOwner"
          ref="selector"
          v-model="modalValue"
          :owner="resolvedOwner"
          :repo="resolvedRepo!"
          :branch="resolvedBranch"
          :installation-id="resolvedInstallationId!"
        />
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
          <UButton color="primary" :disabled="!modalValue" @click="confirmSelection">
            Select {{ modalValue === '/' ? 'Root' : modalValue }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const modelValue = defineModel<string>();
const props = defineProps<{
  owner?: string;
  repo?: string;
  branch?: string;
  installationId?: number;
}>();

const isOpen = ref(false);
const selector = ref();
const inputValue = ref(modelValue.value ?? '/');
const modalValue = ref(modelValue.value ?? '/');

watch(modelValue, (val) => { 
  inputValue.value = val ?? '/'; 
  modalValue.value = val ?? '/';
});

watch(isOpen, (newVal) => {
  if (newVal) {
    modalValue.value = inputValue.value;
  }
});

const repoInfo = useState<{owner: string, repo: string, installation_id: number} | null>('repoInfo', () => null);
const selectedBranchName = useState<string | undefined>('selectedBranchName', () => undefined);

const resolvedOwner = computed(() => props.owner ?? repoInfo.value?.owner);
const resolvedRepo = computed(() => props.repo ?? repoInfo.value?.repo);
const resolvedBranch = computed(() => props.branch ?? selectedBranchName.value ?? 'main');
const resolvedInstallationId = computed(() => props.installationId ?? repoInfo.value?.installation_id);

const onBlur = () => {
  if (inputValue.value !== modelValue.value) modelValue.value = inputValue.value;
};

const confirmSelection = () => {
  const selected = modalValue.value;
  if (selected && selected !== modelValue.value) {
    const path = selected === '/' ? '/' : (selected.endsWith('/') ? selected : `${selected}/`);
    modelValue.value = path;
    inputValue.value = path;
  }
  isOpen.value = false;
};
</script>
