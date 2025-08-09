<template>
  <UModal 
    title="Add new AWS account"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm">Enter the Access Key ID and Secret Access Key for the IAM role you have created. For more information, see <NuxtLink to="https://thunder.so/docs/aws">documentation</NuxtLink></p>
        
        <UAlert v-if="error" color="warning" variant="outline" class="mb-3">
          <template #title>{{ error.message }}</template>
        </UAlert>

        <UForm id="form" :schema="schema" :state="state" @submit="submitForm">
          <UFormField label="Alias" name="alias" required class="mb-3">
            <UInput v-model="state.alias" placeholder="Production" size="lg" />
          </UFormField>
        
          <UFormField label="Access Key ID" name="accessKeyId" required class="mb-3">
            <UInput v-model="state.accessKeyId" size="lg" class="w-full" />
          </UFormField>

          <UFormField label="Secret Access Key" name="secretAccessKey" required>
            <UInput v-model="state.secretAccessKey" type="password" size="lg" class="w-full" />
          </UFormField>
        </UForm>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end items-center gap-4">
        <UButton variant="ghost" @click="emit('close', true)">Cancel</UButton>
        <UButton
          :loading="loading" 
          type="submit"
          form="form"
        >
          Save Account
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { TRPCClientError } from '@trpc/client'
const toast = useToast()
const { $client } = useNuxtApp()

const props = defineProps<{
  organizationId: string
}>()

const emit = defineEmits<{ close: [boolean] }>()

const schema = z.object({
  alias: z.string()
    .min(3, 'Must be at least 3 characters')
    .regex(/^[a-zA-Z]*$/, 'May only contain letters'),
  accessKeyId: z.string().min(1, 'Access Key ID is required'),
  secretAccessKey: z.string().min(1, 'Secret Access Key is required')
})

type Schema = z.output<typeof schema>

const state = ref({
  alias: '',
  accessKeyId: '',
  secretAccessKey: '',
});
const loading = ref(false);
const error = ref<{ message: string } | null>(null);

async function submitForm(event: FormSubmitEvent<Schema>) {
  loading.value = true;
  error.value = null;
  try {
    await $client.providers.addManualProvider.mutate({
      organizationId: props.organizationId as string,
      ...event.data,
    });
    toast.add({ title: 'AWS Account added successfully!', color: 'success' });
    emit('close', true)
  } catch (e: any) {
    if (e instanceof TRPCClientError) {
      error.value = { message: e.message };
    } else {
      error.value = { message: 'An unexpected error occurred' };
    }
  } finally {
    loading.value = false;
  }
}
</script>