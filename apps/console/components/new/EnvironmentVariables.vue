<template>
  <UForm ref="form" :state="modelValue" :schema="envVarSchema" class="space-y-4">
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Environment Variables</h2>
    <div v-for="(variable, index) in modelValue" :key="index" class="grid grid-cols-9 gap-x-2 mt-2 items-start">
      <UFormField :name="`${index}.key`" class="col-span-4">
        <UInput 
          :model-value="variable.key" 
          @update:model-value="updateKey(index, $event)"
          placeholder="Key" 
          class="w-full" 
        />
      </UFormField>
      <UFormField :name="`${index}.value`" class="col-span-4">
        <UInput 
          :model-value="variable.value" 
          @update:model-value="updateValue(index, $event)"
          placeholder="Value" 
          class="w-full" 
        />
      </UFormField>
      <div class="col-span-1">
        <UButton icon="heroicons:trash" color="error" variant="ghost" @click="removeVariable(index)" />
      </div>
    </div>
    <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" class="mt-2" @click="addVariable">Add Variable</UButton>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { z } from 'zod';
import { envVarSchema } from '~/server/validators/common';

const props = defineProps({
  modelValue: {
    type: Array as () => { key: string; value: string }[],
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const form = ref();

const hasErrors = computed(() => {
  return form.value?.errors?.length > 0;
});

defineExpose({ hasErrors });

const updateKey = (index: number, newKey: string) => {
  const updated = [...props.modelValue];
  updated[index] = { ...updated[index], key: newKey };
  emit('update:modelValue', updated);
};

const updateValue = (index: number, newValue: string) => {
  const updated = [...props.modelValue];
  updated[index] = { ...updated[index], value: newValue };
  emit('update:modelValue', updated);
};

const addVariable = () => {
  const updated = [...props.modelValue, { key: '', value: '' }];
  emit('update:modelValue', updated);
};

const removeVariable = (index: number) => {
  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated);
};
</script>
