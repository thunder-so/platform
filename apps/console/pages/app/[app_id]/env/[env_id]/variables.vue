<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Environment Variables</h2>
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
definePageMeta({
  layout: 'app',
});

const supabase = useSupabaseClient();
const { applicationSchema } = useApplications();
const { $client } = useNuxtApp();

if (!applicationSchema.value) {
  throw Error('Application schema not found.')
}

const environment = applicationSchema.value?.environments?.[0];

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
  if (variable?.id) {
    await $client.environments.deleteEnvironmentVariable.mutate({ id: variable?.id as string });
  }
  formState.value.variables.splice(index, 1);
};

const saveVariable = async () => {
  isSaving.value = true;
  try {
    for (const variable of formState.value.variables) {
      await $client.environments.upsertEnvironmentVariable.mutate({
        id: variable.id,
        environment_id: environment?.id as string,
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
    fetchVariables(environment?.id as string);
  }
};

onMounted(() => {
  if (!applicationSchema) {
    return
  }
  if (environment?.id) {
    fetchVariables(environment.id);
  }
});
</script>