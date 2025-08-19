<template>
  <div>
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Environment Variables</h2>
    <div v-for="(variable, index) in localVariables" :key="index" class="grid grid-cols-9 gap-x-2 mt-2 items-start">
      <UFormField :name="`${name}[${index}]`" class="col-span-4">
        <UInput v-model="variable.key" placeholder="Key" class="w-full" />
      </UFormField>
      <UFormField :name="`${name}[${index}]`" class="col-span-4">
        <UInput v-model="variable.value" placeholder="Value" class="w-full" />
      </UFormField>
      <div class="col-span-1">
        <UButton icon="heroicons:trash" color="error" variant="ghost" @click="removeVariable(index)" />
      </div>
    </div>
    <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" class="mt-2" @click="addVariable">Add Variable</UButton>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array as () => Record<string, string>[],
    required: true,
  },
  name: {
    type: String,
    required: true,
  }
});

const emit = defineEmits(['update:modelValue']);

const localVariables = ref(props.modelValue.map(obj => {
  const [key, value] = Object.entries(obj)[0] || ['', ''];
  return { key, value };
}));

// Watch for changes and emit updates
watch(localVariables, (newVariables) => {
  const formatted = newVariables
    .filter(v => v.key.trim() !== '') // Only include variables with keys
    .map(v => ({ [v.key]: v.value }));
  emit('update:modelValue', formatted);
}, { deep: true });

const addVariable = () => {
  localVariables.value.push({ key: '', value: '' });
};

const removeVariable = (index: number) => {
  localVariables.value.splice(index, 1);
};
</script>
