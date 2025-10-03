<script setup lang="ts">
const props = defineProps<{
  application: any
}>()

const emit = defineEmits<{ close: [applicationId: string | null] }>()

const confirmationInput = ref('')

const isDeleteEnabled = computed(() => confirmationInput.value === 'delete')
</script>

<template>
  <UModal 
    title="Delete application"
    description="Are you sure you want to delete this application?"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-sm text-muted">Are you sure you want to delete the application <code class="text-white">{{ application.name }}</code>?</p> 
      <p class="text-sm text-muted">This action cannot be undone.</p>
      <UFormField label="Enter `delete` to confirm" name="applicationId" class="mt-4">
          <UInput v-model="confirmationInput" class="w-full" />
      </UFormField>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton :disabled="!isDeleteEnabled" color="error" @click="emit('close', props.application.id)">Delete</UButton>
    </template>
  </UModal>
</template>