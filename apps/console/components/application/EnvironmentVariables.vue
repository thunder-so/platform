<template>
  <div>
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Environment Variables</h2>
    <div v-for="(variable, index) in variables" :key="index" class="flex items-center space-x-2 mt-2">
      <UInput v-model="variable.key" placeholder="Key" class="w-1/2" />
      <UInput v-model="variable.value" placeholder="Value" class="w-1/2" />
      <UButton icon="heroicons:trash" color="error" variant="ghost" @click="removeVariable(index)" />
    </div>
    <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" class="mt-2" @click="addVariable">Add Variable</UButton>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: [Object, Array],
    required: true,
  },
  dataType: {
    type: String,
    required: true,
    validator: (value: string) => ['object', 'array'].includes(value),
  }
});

const emit = defineEmits(['update:modelValue']);

const variables = ref<{ key: string; value: string }[]>([]);

const normalizedVariables = computed(() => {
  if (props.dataType === 'object') {
    return Object.entries(props.modelValue || {}).map(([key, value]) => ({ key, value: value as string }));
  }
  return (props.modelValue || []).map((item: any) => ({ ...item }));
});

watch(normalizedVariables, (newVal) => {
  variables.value = newVal;
}, { immediate: true, deep: true });

const addVariable = () => {
  variables.value.push({ key: '', value: '' });
};

const removeVariable = (index: number) => {
  variables.value.splice(index, 1);
};

watch(variables, (newVal) => {
  if (props.dataType === 'object') {
    const obj = newVal.reduce((acc, { key, value }) => {
      if (key) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);
    if (JSON.stringify(obj) !== JSON.stringify(props.modelValue)) {
      emit('update:modelValue', obj);
    }
  } else {
    if (JSON.stringify(newVal) !== JSON.stringify(props.modelValue)) {
      emit('update:modelValue', newVal);
    }
  }
}, { deep: true });
</script>
