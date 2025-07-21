<template>
  <div>
    <h1>Environment Variables</h1>
    <p>Variables for environment {{ $route.params.env_id }}</p>

    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Plaintext Variables</h2>
      </template>

      <UForm :state="formState" @submit="saveVariable">
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
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useApplications } from '~/composables/useApplications';
import { useSupabaseClient } from '#imports';

definePageMeta({
  layout: 'app',
});

const route = useRoute();
const supabase = useSupabaseClient();
const { applicationSchema } = useApplications();
const { $client } = useNuxtApp();

const formState = ref({
  variables: [] as { id?: string; key: string; value: string }[],
});

const isSaving = ref(false);

const fetchVariables = async (envId: string) => {
  try {
    const { data, error } = await supabase
      .from('environment_variables')
      .select('*')
      .eq('environment_id', envId)
      .is('deleted_at', null);
    
    if (error) throw error;
    formState.value.variables = data || [];
  } catch (e: any) {
    console.error('Error fetching environment variables:', e.message);
  }
};

const addVariable = () => {
  formState.value.variables.push({ key: '', value: '' });
};

const removeVariable = async (index: number) => {
  const variable = formState.value.variables[index];
  if (variable.id) {
    await $client.environments.deleteEnvironmentVariable.mutate({ id: variable?.id as string });
  }
  formState.value.variables.splice(index, 1);
};

const saveVariable = async () => {
  isSaving.value = true;
  try {
    const envId = route.params.env_id as string;
    for (const variable of formState.value.variables) {
      await $client.environments.upsertEnvironmentVariable.mutate({
        id: variable.id,
        environmentId: envId,
        key: variable.key,
        value: variable.value,
      });
    }
    console.log('Environment variables saved successfully!');
  } catch (e: any) {
    console.error('Error saving environment variables:', e.message);
  } finally {
    isSaving.value = false;
    // Re-fetch to ensure IDs are populated for newly added variables
    fetchVariables(route.params.env_id as string);
  }
};

watch(() => route.params.env_id, (newEnvId) => {
  if (newEnvId) {
    fetchVariables(newEnvId as string);
  }
}, { immediate: true });

// Initial fetch on component mount
// onMounted(() => {
//   if (route.params.env_id) {
//     fetchVariables(route.params.env_id as string);
//   }
// });
</script>