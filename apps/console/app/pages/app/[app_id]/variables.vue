<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2>Environment Variables</h2>
      </template>

      <div v-if="loading" class="flex items-center space-x-4">
        <USkeleton class="h-8 w-full" />
        <USkeleton class="h-8 w-full" />
      </div>
      <div v-else-if="error" class="flex justify-center">
        <p class="text-red-500">{{ error.message }}</p>
      </div>
      
      <UForm ref="form" :schema="envVarSchema" :state="formState.variables" class="space-y-4"  :validate-on="['blur']">
        <div v-for="(variable, index) in formState.variables" :key="variable.id || `new-${index}`" class="grid grid-cols-9 gap-x-2 mt-2 items-start">
          <UFormField :name="`${index}.key`" class="col-span-4">
            <UInput 
              v-model="variable.key" 
              placeholder="Key" 
              class="w-full" 
            />
          </UFormField>
          <UFormField :name="`${index}.value`" class="col-span-4">
            <UInput 
              v-model="variable.value" 
              placeholder="Value" 
              class="w-full" 
            />
          </UFormField>
          <div class="col-span-1">
            <UButton icon="tabler:trash" color="error" variant="ghost" @click="removeVariable(index)" />
          </div>
        </div>
        <UButton color="primary" variant="outline" icon="tabler:plus" class="mt-2" @click="addVariable">Add Variable</UButton>
      </UForm>

      <template #footer>
        <div class="flex gap-2">
          <UButton :loading="localSaving" :disabled="!isDirty" @click="() => saveAndRebuild(() => saveVariablesData(), 'Variables saved.')">
            Save and Rebuild
          </UButton>
          <UButton :loading="localSaving" :disabled="!isDirty" @click="() => saveOnly(() => saveVariablesData(), 'Variables saved.')" color="neutral" variant="outline">
            Save
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import type { ServiceVariable } from '~~/server/db/schema';
import { isEqual } from 'lodash-es';
import { z } from 'zod';
import { envVarSchema } from '~~/server/validators/common';
import type { Form } from '#ui/types';
import { AppVariableDeleteModal } from '#components';
import { useNavigationGuard } from '~/composables/useNavigationGuard';

definePageMeta({
  layout: 'app',
});

const { applicationSchema } = useApplications();
const { $client } = useNuxtApp();
const supabase = useSupabaseClient();
const toast = useToast();
const overlay = useOverlay();
const { isSaving, saveOnly, saveAndRebuild } = useSaveAndRebuild();

const service = computed(() => applicationSchema.value?.environments?.[0]?.services?.[0]);

const form = ref<Form<z.infer<typeof envVarSchema>> | null>(null);
const formState = ref<{ variables: Partial<ServiceVariable>[] }>({ variables: [] });
const originalState = ref<{ variables: Partial<ServiceVariable>[] }>({ variables: [] });
const localSaving = ref(false);
const loading = ref(true);
const error = ref<Error | null>(null);
const isDirty = ref(false);

useNavigationGuard(isDirty);

watch(formState, (newState) => {
  if (originalState.value.variables) {
    isDirty.value = !isEqual(originalState.value.variables, newState.variables);
  }
}, { deep: true });

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
    originalState.value.variables = JSON.parse(JSON.stringify(data || []));
    isDirty.value = false;
  } catch (e: any) {
    error.value = e;
    toast.add({ title: 'Error fetching variables.', description: e.message, color: 'error' });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchVariables();
});

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
  
  if (!variable?.id) {
    formState.value.variables.splice(index, 1);
    return;
  }

  const deleteModal = overlay.create(AppVariableDeleteModal, {
    props: { variable }
  });

  const result = await deleteModal.open().result;
  
  if (result === variable.id) {
    await deleteVariable(variable.id, index);
  }
};

const deleteVariable = async (id: string, index: number) => {
  try {
    await $client.services.deleteServiceVariable.mutate({ id });
    formState.value.variables.splice(index, 1);
    toast.add({ title: 'Variable removed.', color: 'success' });
  } catch (e: any) {
    toast.add({ title: 'Error removing variable.', description: e.message, color: 'error' });
  }
};

const saveVariablesData = async () => {
  if (!form.value) return;
  await form.value.validate();
  
  if (!service.value) return;
  
  const variableType = service.value.stack_type === 'SPA' ? 'build' : 'runtime';
  
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
  
  await fetchVariables();
};
</script>
