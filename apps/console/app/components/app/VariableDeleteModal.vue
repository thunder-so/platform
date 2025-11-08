<template>
  <UModal 
    title="Delete variable"
    description="Are you sure you want to delete this variable?"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-sm text-muted">Are you sure you want to delete this variable?</p> 
      <p class="text-sm text-muted">This action cannot be undone.</p>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton color="error" @click="emit('close', props.variable.id)">Delete</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  variable: any
}>()

const emit = defineEmits<{ close: [applicationId: string | null] }>()
</script>