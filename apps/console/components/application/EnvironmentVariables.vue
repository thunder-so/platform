<template>
  <div>
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Environment Variables</h2>
    <div v-for="(variable, index) in modelValue" :key="index" class="grid grid-cols-9 gap-x-2 mt-2 items-start">
      <UFormField :name="`${name}.${index}`" class="col-span-4">
        <UInput 
          :model-value="getKey(variable)" 
          @update:model-value="updateKey(index, $event)"
          placeholder="Key" 
          class="w-full" 
        />
      </UFormField>
      <UFormField :name="`${name}.${index}`" class="col-span-4">
        <UInput 
          :model-value="getValue(variable)" 
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
  </div>
</template>

<script setup lang="ts">
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

const getKey = (variable: Record<string, string>) => {
  return Object.keys(variable)[0] || '';
};

const getValue = (variable: Record<string, string>) => {
  return Object.values(variable)[0] || '';
};

const updateKey = (index: number, newKey: string) => {
  const updated = [...props.modelValue];
  const oldValue = getValue(updated[index]);
  updated[index] = { [newKey]: oldValue };
  emit('update:modelValue', updated);
};

const updateValue = (index: number, newValue: string) => {
  const updated = [...props.modelValue];
  const oldKey = getKey(updated[index]);
  updated[index] = { [oldKey]: newValue };
  emit('update:modelValue', updated);
};

const addVariable = () => {
  const updated = [...props.modelValue, { '': '' }];
  emit('update:modelValue', updated);
};

const removeVariable = (index: number) => {
  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated);
};
</script>
