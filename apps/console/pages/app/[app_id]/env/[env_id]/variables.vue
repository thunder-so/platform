<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h3>Environment Variables</h3>
      </template>

      <div v-if="loading" class="flex items-center space-x-4">
        <USkeleton class="h-8 w-full" />
        <USkeleton class="h-8 w-full" />
      </div>
      <div v-else-if="error" class="flex justify-center">
        <p class="text-red-500">{{ error.message }}</p>
      </div>
      
      <UForm ref="form" :state="formState" class="space-y-4" @submit="saveVariables">
        <div v-for="(variable, index) in formState.variables" :key="variable.id || `new-${index}`" class="grid grid-cols-9 gap-x-2 mt-2 items-start">
          <UFormField :name="`variables[${index}].key`" class="col-span-4">
            <UInput 
              v-model="variable.key" 
              placeholder="Key" 
              class="w-full" 
            />
          </UFormField>
          <UFormField :name="`variables[${index}].value`" class="col-span-4">
            <UInput 
              v-model="variable.value" 
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

      <template #footer>
        <div class="flex justify-end">
          <UButton :loading="isSaving" color="primary" @click="saveVariables">Save Variables</UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import type { ServiceVariable } from '~/server/db/schema';

definePageMeta({
  layout: 'app',
});

const { applicationSchema } = useApplications();
const { $client } = useNuxtApp();
const supabase = useSupabaseClient();
const toast = useToast();

const service = computed(() => applicationSchema.value?.environments?.[0]?.services?.[0]);

const formState = ref<{ variables: Partial<ServiceVariable>[] }>({ variables: [] });
const isSaving = ref(false);
const loading = ref(true);
const error = ref<Error | null>(null);

const fetchVariables = async () => {
  if (!service.value?.id) return;

  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('service_variables')
      .select('*')
      .eq('service_id', service.value.id)
      .is('deleted_at', null);

    if (fetchError) throw fetchError;
    formState.value.variables = data || [];
  } catch (e: any) {
    error.value = e;
    toast.add({ title: 'Error fetching variables.', description: e.message, color: 'error' });
  } finally {
    loading.value = false;
  }
};

onMounted(fetchVariables);

watch(() => service.value?.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    fetchVariables();
  }
});

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
    } catch (e: any) {
      toast.add({ title: 'Error removing variable.', description: e.message, color: 'error' });
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
      const { id, ...data } = variable;

      if (!data.key || !data.value) {
        if (id) {
          return $client.services.deleteServiceVariable.mutate({ id });
        }
        return Promise.resolve();
      }
      
      const mutationInput = {
        ...data,
        service_id: service.value!.id,
        type: variableType,
      };

      if (id) {
        return $client.services.updateServiceVariable.mutate({ ...mutationInput, id });
      } else {
        return $client.services.createServiceVariable.mutate(mutationInput);
      }
    }));

    toast.add({ title: 'Environment variables saved successfully!', color: 'success' });
    await fetchVariables();

  } catch (e: any) {
    toast.add({ title: 'Error saving variables.', description: e.message, color: 'error' });
  } finally {
    isSaving.value = false;
  }
};
</script>
