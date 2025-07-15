<script setup lang="ts">
const props = defineProps<{
  provider: any
}>()

const emit = defineEmits<{ close: [providerId: string | null] }>()

const confirmationInput = ref('')

const isDeleteEnabled = computed(() => confirmationInput.value === 'delete')
</script>

<template>
  <UModal 
    title="Edit AWS Account"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UFormField label="Enter delete to confirm" name="providerId">
        <UInput v-model="confirmationInput" />
      </UFormField>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton :disabled="!isDeleteEnabled" color="neutral" @click="emit('close', props.provider.id)">Delete</UButton>
    </template>
  </UModal>
</template>