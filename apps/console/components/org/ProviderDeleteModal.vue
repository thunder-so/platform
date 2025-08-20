<script setup lang="ts">
const props = defineProps<{
  provider: any
  mode: 'confirmDelete' | 'cannotDelete'
}>()

const emit = defineEmits<{ close: [providerId: string | null] }>()

const confirmationInput = ref('')

const isDeleteEnabled = computed(() => confirmationInput.value === 'delete')
</script>

<template>
  <UModal 
    :title="mode === 'cannotDelete' ? 'Cannot Delete Provider' : 'Delete AWS Account'"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div v-if="mode === 'cannotDelete'">
        <p>This provider is currently associated with one or more active environments and cannot be deleted.</p>
      </div>
      <div v-else>
        <p>Are you sure you want to delete the provider "{{ provider.alias }}"? This action cannot be undone.</p>
        <UFormField label="Enter delete to confirm" name="providerId" class="mt-4">
          <UInput v-model="confirmationInput" />
        </UFormField>
      </div>
    </template>
    
    <template #footer="{ close }">
      <div v-if="mode === 'cannotDelete'">
        <UButton label="Close" color="neutral" @click="close" />
      </div>
      <div v-else class="flex gap-2">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton :disabled="!isDeleteEnabled" color="error" @click="emit('close', props.provider.id)">Delete</UButton>
      </div>
    </template>
  </UModal>
</template>