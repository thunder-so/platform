<template>
  <div>
    <!-- <UCard class="mt-4">
      <template #header>
        <h1>Repository settings</h1>
      </template>

      <div class="space-y-4">
        <UAlert v-if="repoError" color="error" variant="subtle" class="mb-4" :title="repoError" />

        <div v-if="applicationSchema.environments" class="space-y-4">
          <UForm ref="form" :state="applicationSchema" :schema="applicationSchema.environments?.[0]?.services" :validate-on="['input']" class="space-y-4">
            <UFormField label="Repository" class="grid grid-cols-3 gap-4">
              <UInput 
                disabled 
                size="lg" 
                variant="outline"
                class="w-full"
              > 
                <template #leading>
                  <p class="flex items-center">
                    <Icon name="mdi:github" class="w-5 h-5 text-muted mr-2" />
                    <span class="text-sm text-muted">{{applicationSchema.environments?.[0]?.services?.[0]?.pipeline_props?.sourceProps?.owner}}/{{applicationSchema.environments?.[0]?.services?.[0]?.pipeline_props?.sourceProps?.repo}}</span>
                  </p>
                </template>
              </UInput>
            </UFormField>

            <UFormField label="Branch" class="grid grid-cols-3 gap-4">
              <USelect 
                v-model="selectedBranchName" 
                :items="branchItems" 
                class="w-96" size="lg"
              />
            </UFormField>
          </UForm>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-start">
          <UButton size="lg">
            Continue
          </UButton>
        </div>
      </template>
    </UCard> -->

    <UCard v-if="localServiceConfig" class="mt-4">
      <template #header>
        <h2 class="text-xl font-semibold">Service Configuration</h2>
      </template>
      <AppServiceConfiguration :service="localServiceConfig" ref="serviceConfigForm" />
      <template #footer>
        <div class="flex justify-start">
          <UButton
            size="lg"
            :loading="isSaving"
            :disabled="!isChanged || hasValidationErrors"
            @click="saveChanges"
          >
            Save Changes
          </UButton>
        </div>
      </template>
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
import { ref, computed, watch } from 'vue';
import AppServiceConfiguration from '~/components/app/ServiceConfiguration.vue';
import type { ServiceSchema } from '~/server/db/schema';
import { isEqual } from 'lodash-es';

definePageMeta({
  layout: 'app',
});

const { 
  applicationSchema, 
  refreshApplicationSchema, 
  // repoError, 
  // selectedBranchName, 
  // branchItems 
} = useApplications();
const { $client } = useNuxtApp();
const router = useRouter();
const toast = useToast();

if (!applicationSchema.value) {
  throw new Error('Application schema not found.')
}

const service = computed(() => applicationSchema.value?.environments?.[0]?.services?.[0] as ServiceSchema | undefined);

const localServiceConfig = ref<ServiceSchema | null>(null);
const isSaving = ref(false);
const isChanged = ref(false);
const error = ref<string | null>(null);

const serviceConfigForm = ref<{ hasErrors: boolean } | null>(null);
const hasValidationErrors = computed(() => serviceConfigForm.value?.hasErrors || false);

watch(service, (newService) => {
  if (newService) {
    localServiceConfig.value = JSON.parse(JSON.stringify(newService));
  }
}, { immediate: true });

watch(localServiceConfig, (newConfig) => {
  if (service.value && newConfig) {
    isChanged.value = !isEqual(service.value, newConfig);
  }
}, { deep: true });

const saveChanges = async () => {
  if (!localServiceConfig.value || !service.value) return;

  isSaving.value = true;
  error.value = null;
  try {
    await $client.services.updateServiceConfig.mutate(localServiceConfig.value as any);
    await refreshApplicationSchema();
    toast.add({ title: 'Settings saved successfully!', color: 'success' });
    isChanged.value = false;
  } catch (e: any) {
    error.value = e.message;
    toast.add({ title: 'Error saving settings', description: e.message, color: 'error' });
  } finally {
    isSaving.value = false;
  }
};

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
  error.value = null;
  try {
    await $client.applications.delete.mutate({ 
      application_id: applicationSchema.value.id as string,
      service_id: service.value?.id as string
    });
    toast.add({ title: 'Application deleted successfully', color: 'success' });
    await router.push('/');
  } catch (e: any) {
    error.value = e.message;
    console.error("Error deleting application:", e);
    toast.add({ title: 'Failed to delete application', description: e.message, color: 'error' });
  }
};
</script>
