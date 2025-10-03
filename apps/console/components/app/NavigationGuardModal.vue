<template>
  <!-- <UModal v-model="isOpen" :prevent-close="true"> -->
  <UModal 
    title="Unsaved changes"
    v-model="isOpen"
  >
      <template #body>
        <p class="text-sm text-muted">
          You have unsaved changes that will be lost if you leave this page.
        </p>
      </template>
      
      <template #footer="{ close }">
        <div class="flex justify-between w-full">
          <UButton 
            color="primary" 
            @click="() => { close(); props.onKeepEditing(); }"
          >
            Keep Editing
          </UButton>
          <UButton 
            variant="outline" 
            color="error" 
            @click="() => { close(); props.onDiscard(); }"
          >
            Discard Changes
          </UButton>
        </div>
      </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  onDiscard: () => void;
  onKeepEditing: () => void;
}

const props = defineProps<Props>();
const isOpen = ref(true);


</script>