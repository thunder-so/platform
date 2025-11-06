<template>
  <UModal 
    title="Delete application"
    description="Are you sure you want to delete this application?"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-sm text-muted">Are you sure you want to delete the application <code class="text-white">{{ props.application?.display_name }}</code>?</p> 
      <p class="text-sm text-muted">This action cannot be undone.</p>
      <UFormField label="Enter `delete` to confirm" name="applicationId" class="mt-4">
          <UInput v-model="confirmationInput" class="w-full" />
      </UFormField>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" :disabled="isDeleting" />
      <UButton :disabled="!isDeleteEnabled" :loading="isDeleting" color="error" @click="deleteApplication">Delete</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ApplicationSchema } from '~~/server/validators/common';

const props = defineProps<{
  application: ApplicationSchema,
  serviceId: string
}>()

const emit = defineEmits<{ close: [success: boolean] }>()

const { $client } = useNuxtApp()
const toast = useToast()
const router = useRouter()

const confirmationInput = ref('')
const isDeleting = ref(false)

const isDeleteEnabled = computed(() => confirmationInput.value === 'delete' && !isDeleting.value)

const deleteApplication = async () => {
  isDeleting.value = true
  try {
    await $client.applications.delete.mutate({ 
      application_id: props.application.id,
      service_id: props.serviceId
    })
    toast.add({ title: 'Application deleted successfully', color: 'success' })
    emit('close', true)
    await router.push('/')
  } catch (e: any) {
    toast.add({ title: 'Failed to delete application', description: e.message, color: 'error' })
  } finally {
    isDeleting.value = false
  }
}
</script>