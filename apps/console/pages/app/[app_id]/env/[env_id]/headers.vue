<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Header Settings</h2>
      </template>

      <UForm :state="formState" @submit="saveSettings">
        <div class="">
          <template v-for="(header, index) in formState.headers" :key="index">
            <UFormField :label="`Path ${index + 1}`" :name="`header-path-${index}`">
              <UInput v-model="header.path" />
            </UFormField>
            <UFormField :label="`Name ${index + 1}`" :name="`header-name-${index}`">
              <UInput v-model="header.name" />
            </UFormField>
            <UFormField :label="`Value ${index + 1}`" :name="`header-value-${index}`">
              <UInput v-model="header.value" />
            </UFormField>
            <div class="col-span-2">
              <UButton icon="i-heroicons-minus" color="info" @click="removeHeader(index)">Remove Header</UButton>
            </div>
          </template>
          <div class="col-span-2">
            <UButton icon="i-heroicons-plus" @click="addHeader">Add Header</UButton>
          </div>
        </div>

        <div class="mt-4">
          <UButton type="submit" :loading="isSaving">Save Settings</UButton>
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
  headers: [] as { path: string; name: string; value: string }[],
});

const isSaving = ref(false);

const fetchHeaderSettings = async (serviceId: string) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('edge_props')
      .eq('id', serviceId)
      .single();

    if (error) throw error;

    if (data?.edge_props?.headers) {
      formState.value.headers = data.edge_props.headers;
    } else {
      formState.value.headers = [];
    }
  } catch (e: any) {
    console.error('Error fetching header settings:', e.message);
  }
};

const addHeader = () => {
  formState.value.headers.push({ path: '', name: '', value: '' });
};

const removeHeader = (index: number) => {
  formState.value.headers.splice(index, 1);
};

const saveSettings = async () => {
  isSaving.value = true;
  try {
    const serviceId = applicationSchema.value?.environments[0]?.services[0]?.id;
    if (!serviceId) {
      console.error('Service ID not found.');
      return;
    }

    await $client.services.updateEdgeProps.mutate({
      serviceId: serviceId,
      edgeProps: { headers: formState.value.headers },
    });
    console.log('Header settings saved successfully!');
  } catch (e: any) {
    console.error('Error saving header settings:', e.message);
  } finally {
    isSaving.value = false;
  }
};

watch(applicationSchema, (newSchema) => {
  if (newSchema) {
    const serviceId = newSchema.environments[0]?.services[0]?.id;
    if (serviceId) {
      fetchHeaderSettings(serviceId);
    }
  }
}, { immediate: true });

// onMounted(() => {
//   if (applicationSchema.value) {
//     const serviceId = applicationSchema.value.environments[0]?.services[0]?.id;
//     if (serviceId) {
//       fetchHeaderSettings(serviceId);
//     }
//   }
// });
</script>