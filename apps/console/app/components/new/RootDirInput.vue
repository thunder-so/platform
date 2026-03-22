<template>
  <div class="flex items-center gap-2 w-96">
    <UInput 
      v-model="modelValue" 
      placeholder="/" 
      class="flex-1" 
      size="lg" 
    />
    <UButton 
      v-if="repoInfo"
      icon="i-lucide-folder-open" 
      color="neutral" 
      variant="subtle" 
      size="lg"
      @click="isOpen = true"
    />
    
    <UModal v-model:open="isOpen" title="Select Root Directory" description="Browse your repository to select the root directory for this service.">
      <template #body>
        <NewMonorepoDirSelector 
          v-if="repoInfo"
          ref="selector"
          v-model="modelValue"
          :owner="repoInfo.owner"
          :repo="repoInfo.repo"
          :branch="selectedBranchName || 'main'"
          :installation-id="repoInfo.installation_id"
        />
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
          <UButton color="primary" :disabled="!modelValue" @click="confirmSelection">
            Select {{ modelValue === '/' ? 'Root' : modelValue }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import MonorepoDirSelector from './MonorepoDirSelector.vue';

const modelValue = defineModel<string>();

const { repoInfo, selectedBranchName } = useNewApplicationFlow();
const isOpen = ref(false);
const selector = ref();

const confirmSelection = () => {
  if (selector.value) {
    selector.value.confirm();
    isOpen.value = false;
  }
};
</script>