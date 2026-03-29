<template>
  <UModal 
    :title="mode === 'cannotDelete' ? 'Cannot Delete Provider' : 'Delete AWS Account'"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div v-if="mode === 'cannotDelete'">
        <UAlert icon="tabler:alert-triangle" color="warning" variant="outline" title="This provider is currently associated with one or more active applications and cannot be deleted." />
      </div>
      <div v-else>
        <p class="text-sm text-muted">Are you sure you want to delete the provider <code class="text-highlighted font-semibold">{{ provider.alias }}</code>?</p>
        <p class="text-sm text-muted">This action cannot be undone.</p>
        <UFormField label="Enter delete to confirm" name="providerId" class="mt-4">
          <UInput v-model="confirmationInput" class="w-full" />
        </UFormField>
      </div>
    </template>
    
    <template #footer="{ close }">
      <div v-if="mode === 'cannotDelete'">
        <UButton label="Close" color="neutral" variant="outline" @click="close" />
      </div>
      <div v-else class="flex gap-2">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="close" />
        <UButton :disabled="!isDeleteEnabled" color="error" @click="emit('close', props.provider.id)">Delete</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  provider: any
  mode: 'confirmDelete' | 'cannotDelete'
}>()

const emit = defineEmits<{ close: [providerId: string | null] }>()

const confirmationInput = ref('')

const isDeleteEnabled = computed(() => confirmationInput.value === 'delete')
</script>