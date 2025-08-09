<template>
  <UModal 
    title="Add new AWS account"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <p>Enter an alias for your new account.</p>
        
        <UForm :schema="schema" :state="state">
          <UFormField label="Alias" name="alias" required class="mb-3">
            <UInput v-model="state.alias" placeholder="Production" size="lg" />
          </UFormField>

          <UFormField label="CloudFormation URL">
            <UInput
              :model-value="cloudformationUrl"
              readonly
              :ui="{ trailing: 'pr-0.5', base: 'w-full', root: 'w-full' }"
            >
              <template #trailing>
                <UTooltip text="Copy to clipboard" :popper="{ placement: 'right' }">
                  <UButton
                    :color="copied ? 'success' : 'neutral'"
                    variant="link"
                    size="sm"
                    :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                    aria-label="Copy to clipboard"
                    @click="copy(cloudformationUrl)"
                  />
                </UTooltip>
              </template>
            </UInput>
          </UFormField>
        </UForm>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end items-center gap-4">
        <UButton variant="ghost" @click="emit('close', true)">Cancel</UButton>
        <UButton
          icon="i-lucide-external-link"
          trailing
          :disabled="!isAliasValid"
          @click="openCloudFormation"
        >
          Open CloudFormation
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { z } from 'zod'

const emit = defineEmits<{ close: [boolean] }>()

const schema = z.object({
  alias: z.string()
    .min(3, 'Must be at least 3 characters')
    .regex(/^[a-zA-Z]*$/, 'May only contain letters')
})

const props = defineProps<{
  organizationId: string
}>()

const state = ref({
  alias: ''
})

const isAliasValid = computed(() => {
  return schema.safeParse(state.value).success
})

const runtimeConfig = useRuntimeConfig()

const { copy, copied } = useClipboard()

const cloudformationUrl = computed(() => {
  if (!isAliasValid.value) {
    return ''
  }
  const baseUrl = 'https://us-east-1.console.aws.amazon.com/cloudformation/home#/stacks/quickcreate';
  const roleTemplateUrl = runtimeConfig.public.providerStack;
  const stackName = `thunder-provider-${state.value.alias.replace(/\s+/g, '-').toLowerCase()}`;
  
  const params = new URLSearchParams({
    templateURL: roleTemplateUrl,
    stackName: stackName,
    param_Alias: state.value.alias,
    param_OrganizationId: props.organizationId || '',
  });

  return `${baseUrl}?${params.toString()}`;
})

function openCloudFormation() {
  if (cloudformationUrl.value && isAliasValid.value) {
    window.open(cloudformationUrl.value, '_blank')
  }
}
</script>