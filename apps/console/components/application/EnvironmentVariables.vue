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
import { ref, watch, computed } from 'vue';

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

const variables = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  if (JSON.stringify(variables.value) !== JSON.stringify(newVal)) {
    variables.value = newVal;
  }
}, { deep: true });

const updateModel = () => {
  emit('update:modelValue', variables.value);
};

const addVariable = () => {
  variables.value.push({ key: '', value: '' });
  updateModel();
};

const removeVariable = (index: number) => {
  variables.value.splice(index, 1);
  updateModel();
};

watch(variables, updateModel, { deep: true });

</script>