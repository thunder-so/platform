<template>
  <UModal 
    title="Delete workspace"
    description="Are you sure you want to delete this workspace?"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-sm text-muted">Are you sure you want to delete the workspace <code class="text-white">{{ org.name }}</code>?</p> 
      <p class="text-sm text-muted">This action cannot be undone.</p>
      <UFormField label="Enter `delete` to confirm" name="orgId" class="mt-4">
          <UInput v-model="confirmationInput" class="w-full" />
      </UFormField>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="ghost" @click="close" />
      <UButton :disabled="!isDeleteEnabled" color="error" @click="emit('close', props.org.id)">Delete</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  org: any
}>()

const emit = defineEmits<{ close: [orgId: string | null] }>()

const confirmationInput = ref('')

const isDeleteEnabled = computed(() => confirmationInput.value === 'delete')
</script>
