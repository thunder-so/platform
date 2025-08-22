
<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Build Settings</h2>
      </template>

      <UForm :state="formState" @submit="saveSettings" class="space-y-4">
        <UFormField label="Root directory" name="rootDir">
          <UInput v-model="formState.appProps.rootDir" />
        </UFormField>

        <!-- Conditional fields for Node-based builds -->
        <template v-if="service?.stack_type === 'SPA' || service?.stack_type === 'FUNCTION'">
          <UFormField label="Install Command" name="installcmd">
            <UInput v-model="formState.buildProps.installcmd" />
          </UFormField>

          <UFormField label="Build Command" name="buildcmd">
            <UInput v-model="formState.buildProps.buildcmd" />
          </UFormField>
        </template>

        <div class="mt-4">
          <UButton type="submit" :loading="isSaving">Save Settings</UButton>
        </div>
      </UForm>
    </UCard>

    <UCard color="error" class="mt-8">
      <template #header>
        <h3>Danger Zone</h3>
      </template>
      <div>
        <UAlert 
          color="error" 
          variant="soft" 
          class="mb-4"
          title="Deleting your application is a permanent action and cannot be undone." 
        />
        <UButton @click="deleteApplicationModal()" variant="outline" color="error">
          Delete Application
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { AppApplicationDeleteModal } from '#components'

definePageMeta({
  layout: 'app',
});

const { applicationSchema, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const router = useRouter();
const toast = useToast();

if (!applicationSchema.value) {
  throw new Error('Application schema not found.')
}
const environment = applicationSchema.value?.environments?.[0];
const service = environment?.services?.[0];

const formState = ref({
  appProps: {
    rootDir: service?.app_props?.rootDir || ''
  },
  buildProps: {
    installcmd: (service?.pipeline_props?.buildProps as any)?.installcmd || '',
    buildcmd: (service?.pipeline_props?.buildProps as any)?.buildcmd || '',
  }
});

const isSaving = ref(false);

const overlay = useOverlay()
const applicationDeleteModal = overlay.create(AppApplicationDeleteModal, {
  props: {application: applicationSchema.value}
});

async function deleteApplicationModal() {
  const result = await applicationDeleteModal.open().result;

  if (result === applicationSchema.value?.id) {
    await deleteApplication();
  }
}

const deleteApplication = async () => {
  try {
    await $client.applications.delete.mutate({ 
      application_id: applicationSchema.value.id as string,
      service_id: service?.id as string
    });
    toast.add({ title: 'Application deleted successfully', color: 'success' });
    await router.push('/');
  } catch (e: any) {
    console.error("Error deleting application:", e);
    toast.add({ title: 'Failed to delete application', description: e.message, color: 'error' });
  }
};

const saveSettings = async () => {
  isSaving.value = true;
  try {
    const serviceId = service?.id;
    if (!serviceId) {
      console.error('Service ID not found.');
      return;
    }
    await $client.services.updateServiceProps.mutate({
      serviceId,
      app_props: formState.value.appProps,
      pipeline_props: {
        buildProps: formState.value.buildProps
      },
    });
    toast.add({ title: 'Build settings saved successfully!', color: 'success' });
  } catch (e: any) {
    console.error('Error saving build settings:', e.message);
    toast.add({ title: 'Error saving build settings', description: e.message, color: 'error' });
  } finally {
    refreshApplicationSchema();
    isSaving.value = false;
  }
};
</script>
