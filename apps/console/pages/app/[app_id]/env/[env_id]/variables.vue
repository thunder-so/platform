<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Environment Variables</h2>
      </template>

      <UForm :state="formState" @submit="saveVariables">
        <div class="grid grid-cols-2 gap-4">
          <template v-for="(variable, index) in formState.variables" :key="variable.id || `new-${index}`">
            <UFormField :label="`Key ${index + 1}`" :name="`variable-key-${index}`">
              <UInput v-model="variable.key" />
            </UFormField>
            <UFormField :label="`Value ${index + 1}`" :name="`variable-value-${index}`">
              <UInput v-model="variable.value" />
            </UFormField>
            <div class="col-span-2">
              <UButton icon="i-heroicons-minus" color="info" @click="removeVariable(index)">Remove Variable</UButton>
            </div>
          </template>
          <div class="col-span-2">
            <UButton icon="i-heroicons-plus" @click="addVariable">Add Variable</UButton>
          </div>
        </div>

        <div class="mt-4">
          <UButton type="submit" :loading="isSaving">Save Variables</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ServiceVariable } from '~/server/db/schema';

definePageMeta({
  layout: 'app',
});

const { applicationSchema, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const toast = useToast();

const service = computed(() => applicationSchema.value?.environments?.[0]?.services?.[0]);

const formState = ref<{ variables: Partial<ServiceVariable>[] }>({ variables: [] });
const isSaving = ref(false);

// Initialize form state from the application schema
watch(service, (currentService) => {
  if (currentService?.serviceVariables) {
    formState.value.variables = JSON.parse(JSON.stringify(currentService.serviceVariables));
  } else {
    formState.value.variables = [];
  }
}, { immediate: true });

const addVariable = () => {
  formState.value.variables.push({ key: '', value: '' });
};

const removeVariable = async (index: number) => {
  const variable = formState.value.variables[index];
  formState.value.variables.splice(index, 1);
  if (variable?.id) {
    try {
      await $client.services.deleteServiceVariable.mutate({ id: variable.id });
      toast.add({ title: 'Variable removed.', color: 'success' });
      await refreshApplicationSchema();
    } catch (e: any) {
      toast.add({ title: 'Error removing variable.', description: e.message, color: 'error' });
      // If the delete fails, add the variable back to the form for the user to see
      formState.value.variables.splice(index, 0, variable);
    }
  }
};

const saveVariables = async () => {
  if (!service.value) return;

  isSaving.value = true;
  const variableType = service.value.stack_type === 'SPA' ? 'build' : 'runtime';

  try {
    await Promise.all(formState.value.variables.map(variable => {
      return $client.services.upsertServiceVariable.mutate({
        ...variable,
  service_id: service.value!.id,
        type: variableType,
      });
    }));

    toast.add({ title: 'Environment variables saved successfully!', color: 'success' });
    await refreshApplicationSchema();

  } catch (e: any) {
    toast.add({ title: 'Error saving variables.', description: e.message, color: 'error' });
  } finally {
    isSaving.value = false;
  }
};
</script>
