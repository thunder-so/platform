<template>
  <UModal 
    title="Delete domain"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-sm text-muted">Are you sure you want to delete the domain <code class="text-white">{{ domain.domain }}</code>?</p>
      <p class="text-sm text-muted mt-2">This will soft-delete the domain record and may take a few moments to propagate.</p>
      <UFormField label="Enter `delete` to confirm" name="domainId" class="mt-4">
        <UInput v-model="confirmationInput" class="w-full" />
      </UFormField>
    </template>

    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton :disabled="!isDeleteEnabled" color="error" @click="emit('close', domain.id)">Delete</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  domain: any
}>()

const emit = defineEmits<{ close: [domainId: string | null] }>()

const confirmationInput = ref('')

const isDeleteEnabled = computed(() => confirmationInput.value === 'delete')
</script>
