<template>
  <UModal 
    title="Edit Account Alias"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UFormField label="Alias" name="alias">
        <UInput v-model="alias" class="w-full" />
      </UFormField>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton color="neutral" @click="emit('close', alias)">Save</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  provider: any
}>()

const emit = defineEmits<{ close: [alias: string | null] }>()

const alias = ref('')

onMounted(() => {
  alias.value = props.provider.alias
})
</script>
