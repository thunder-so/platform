<template>
  <div>
    <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Environment Variables</h2>
    <div v-for="(variable, index) in variables" :key="index" class="grid grid-cols-12 gap-x-2 mt-2 items-start">
      <UFormField :name="`${name}[${index}].key`" class="col-span-5">
        <UInput v-model="variable.key" placeholder="Key" class="w-full" />
      </UFormField>
      <UFormField :name="`${name}[${index}].value`" class="col-span-6">
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
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array as () => { key: string; value: string }[],
    required: true,
  },
  name: {
    type: String,
    required: true,
  }
});

const emit = defineEmits(['update:modelValue']);

// Using a computed property with a getter and setter is the standard
// and safest way to implement v-model on a component.
const variables = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
  }
});

const addVariable = () => {
  // To update, we emit a new array with the added item.
  const newArray = [...variables.value, { key: '', value: '' }];
  emit('update:modelValue', newArray);
};

const removeVariable = (index: number) => {
  // To update, we emit a new array with the item removed.
  const newArray = [...variables.value];
  newArray.splice(index, 1);
  emit('update:modelValue', newArray);
};
</script>
