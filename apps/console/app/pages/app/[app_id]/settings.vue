<template>
  <div>
    <UCard v-if="!applicationSchema">
      <template #header>
        <USkeleton class="h-6 w-40" />
      </template>
      <USkeleton class="h-6 w-full" />
      <template #footer>
        <USkeleton class="h-8 w-40" />
      </template>
    </UCard>
    <UCard v-else>
      <template #header>
        <h2>Application settings</h2>
      </template>
      <UForm ref="ApplicationSettingsForm" :state="applicationSchema" :validate-on="['input']" class="space-y-4">
        <UFormField label="Application name" description="Your application's unique name." name="name" class="grid grid-cols-3 gap-4">
          <UInput v-model="applicationSchema.display_name" class="w-96" size="lg" />
        </UFormField>
      </UForm>
      <template #footer>
        <div class="flex justify-start">
          <UButton
            size="lg"
            :loading="isAppSaving"
            :disabled="!isAppChanged"
            @click="saveAppChanges"
          >
            Save Changes
          </UButton>
        </div>
      </template>
    </UCard>

    <UCard v-if="localServiceConfig" class="mt-4">
      <template #header>
        <h3>Service settings</h3>
      </template>
      <AppServiceConfiguration :service="localServiceConfig" ref="serviceConfigForm" />
      <template #footer>
        <div class="flex justify-start">
          <MultiButton
            color="primary"
            :loading="isSaving"
            :disabled="!isChanged || hasValidationErrors"
            label="Save"
            :options="[
              { label: 'Save', action: () => saveOnly(() => saveServiceMetadata(), 'Service settings saved.') },
              { label: 'Save and Rebuild', action: () => saveAndRebuild(() => saveServiceMetadata(), 'Service settings saved.') }
            ]"
          />
        </div>
      </template>
    </UCard>

    <UCard v-if="service" class="mt-4">
      <template #header>
        <h3>Github settings</h3>
      </template>
      <UForm :state="{}" class="space-y-6">
        <UFormField label="Repository" description="Github account and repository." name="repo" class="grid grid-cols-3 gap-4">
          <UInput :model-value="`${service.pipeline_metadata?.sourceProps?.owner}/${service.pipeline_metadata?.sourceProps?.repo}`" class="w-96" size="lg" disabled />
        </UFormField>
        <UFormField label="Branch" description="Repository branch used for this deployment." name="branch" class="grid grid-cols-3 gap-4">
          <USelect v-model="selectedBranch" :items="branchItems" class="w-96" size="lg" />
        </UFormField>
        <UFormField label="Root Directory" description="The root directory of your project. For monorepos, enter the path to the project." name="rootDir" class="grid grid-cols-3 gap-4">
          <RootDirInput v-model="selectedRootDir" :owner="service.pipeline_metadata?.sourceProps?.owner ?? undefined" :repo="service.pipeline_metadata?.sourceProps?.repo ?? undefined" :branch="service.pipeline_metadata?.sourceProps?.branchOrRef ?? undefined" :installation-id="service.installation_id ?? undefined" />
        </UFormField>
      </UForm>
      <template #footer>
        <div class="flex justify-start">
          <MultiButton
            color="primary"
            :loading="isBranchSaving"
            :disabled="!isBranchChanged"
            label="Save"
            :options="[
              { label: 'Save', action: saveBranchOnly },
              { label: 'Save and Rebuild', action: saveBranchAndRebuild }
            ]"
          />
        </div>
      </template>
    </UCard>

    <UCard v-if="applicationSchema" color="error" class="mt-8">
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
import { AppApplicationDeleteModal, MultiButton } from '#components'
import { ref, computed, watch, onMounted } from 'vue';
import AppServiceConfiguration from '~/components/app/ServiceConfiguration.vue';
import type { ServiceSchema } from '~~/server/validators/app';
import { isEqual } from 'lodash-es';
import { useNavigationGuard } from '~/composables/useNavigationGuard';
import type { Branch } from '~~/server/db/schema';

definePageMeta({
  layout: 'app',
});

const { 
  applicationSchema, 
  refreshApplicationSchema,
  currentService: service,
} = useApplications();
const { $client } = useNuxtApp()
const route = useRoute();
const router = useRouter()
const envId = route.params.env_id as string;
const supabase = useSupabaseClient();
const notificationPreferences = ref<Record<string, boolean>>({})
const originalNotificationPreferences = ref<Record<string, boolean>>({})
const savingNotificationPreferences = ref(false)
const hasNotificationChanges = computed(() => {
  return JSON.stringify(notificationPreferences.value) !== JSON.stringify(originalNotificationPreferences.value)
});

const notificationChannels = [
  { value: 'EMAIL', label: 'Email', description: 'Receive notifications via email' },
  { value: 'SLACK', label: 'Slack', description: 'Receive notifications via Slack' },
  { value: 'DISCORD', label: 'Discord', description: 'Receive notifications via Discord' },
  { value: 'IN_APP', label: 'In-App', description: 'Receive notifications in the app' }
];

const notificationTypes = [
  { value: 'APP_BUILD_SUCCESS', label: 'Build success', description: 'Notify when environment has been successfully built.' },
  { value: 'APP_BUILD_FAILURE', label: 'Build failed', description: 'Notify when environment build has failed.' },
  { value: 'APP_DEPLOY_SUCCESS', label: 'Deployment success', description: 'Notify when deployments have successfully completed.' },
  { value: 'APP_DEPLOY_FAILURE', label: 'Deployment failed', description: 'Notify when deployments have failed.' },
];

const localServiceConfig = ref<ServiceSchema | null>(null);
const originalServiceConfig = ref<ServiceSchema | null>(null);
const initialized = ref(false);
const { isSaving, saveOnly, saveAndRebuild } = useSaveAndRebuild();
const isChanged = ref(false);
const isAppSaving = ref(false);
const isAppChanged = ref(false);
const originalDisplayName = ref<string>('');

const toast = useToast();
const overlay = useOverlay();

const serviceConfigForm = ref<{ hasErrors: boolean } | null>(null);
const hasValidationErrors = computed(() => serviceConfigForm.value?.hasErrors || false);

const isBranchSaving = ref(false);
const isBranchChanged = ref(false);
const branches = ref<Branch[]>([]);
const branchItems = computed(() => branches.value.map(b => ({ value: b.name, label: b.name })));
const selectedBranch = ref<string>('');
const selectedRootDir = ref<string>('/');

const isDirty = computed(() => isChanged.value || isAppChanged.value || isBranchChanged.value);

useNavigationGuard(isDirty);

const fetchBranches = async () => {
  if (service.value?.pipeline_metadata?.sourceProps?.owner && service.value?.pipeline_metadata?.sourceProps?.repo && service.value?.installation_id) {
    try {
      const branchData = await $client.github.getBranches.query({
        owner: service.value.pipeline_metadata.sourceProps.owner,
        repo: service.value.pipeline_metadata.sourceProps.repo,
        installation_id: service.value.installation_id,
      });
      branches.value = branchData;
    } catch (e) {
      console.error('Failed to fetch branches', e);
      toast.add({ title: 'Error fetching branches', color: 'error' });
    }
  }
};

watch(service, async (newService, oldService) => {
  if (newService && (!oldService || oldService.id !== newService.id)) {
    localServiceConfig.value = JSON.parse(JSON.stringify(newService));
    originalServiceConfig.value = JSON.parse(JSON.stringify(newService));
    isChanged.value = false;
    initialized.value = true;
    if (newService.pipeline_metadata?.sourceProps?.branchOrRef) {
      selectedBranch.value = newService.pipeline_metadata.sourceProps.branchOrRef;
    }
    selectedRootDir.value = newService.rootDir ?? '/';
    await fetchBranches();
  }
}, { immediate: true });

watch(applicationSchema, (newApp) => {
  if (newApp?.display_name) {
    originalDisplayName.value = newApp.display_name;
  }
}, { immediate: true });

watch(() => applicationSchema.value?.display_name, (newName) => {
  isAppChanged.value = newName !== originalDisplayName.value;
});

watch(localServiceConfig, (newConfig) => {
  if (!initialized.value || !originalServiceConfig.value || !newConfig) return;
  const originalMeta = JSON.stringify(originalServiceConfig.value?.metadata);
  const currentMeta = JSON.stringify(newConfig?.metadata);
  const originalPipelineMeta = JSON.stringify(originalServiceConfig.value?.pipeline_metadata);
  const currentPipelineMeta = JSON.stringify(newConfig?.pipeline_metadata);
  isChanged.value = originalMeta !== currentMeta || originalPipelineMeta !== currentPipelineMeta;
}, { deep: true });

watch(selectedBranch, (newBranch) => {
  if (service.value?.pipeline_metadata?.sourceProps?.branchOrRef) {
    isBranchChanged.value = newBranch !== service.value.pipeline_metadata.sourceProps.branchOrRef || selectedRootDir.value !== (service.value.rootDir ?? '/');
  }
});

watch(selectedRootDir, (newRootDir) => {
  if (service.value) {
    isBranchChanged.value = selectedBranch.value !== service.value.pipeline_metadata?.sourceProps?.branchOrRef || newRootDir !== (service.value.rootDir ?? '/');
  }
});

onMounted(() => {
  fetchBranches();
});

const saveServiceMetadata = async () => {
  if (!localServiceConfig.value?.metadata) return;
  
  const { stack_type, id, pipeline_metadata } = localServiceConfig.value;
  const { $posthog } = useNuxtApp();
  
  await $client.services.updateServiceConfig.mutate({
    service_id: id,
    stack_type,
    metadata: localServiceConfig.value.metadata,
    pipeline_metadata: pipeline_metadata,
  });
  
  originalServiceConfig.value = JSON.parse(JSON.stringify(localServiceConfig.value));
  
  $posthog().capture('app_settings_updated', {
    service_id: id,
    stack_type,
    app_id: applicationSchema.value?.id
  });
};

const saveBranchOnly = async () => {
  isBranchSaving.value = true;
  const { $posthog } = useNuxtApp();
  try {
    await saveOnly(async () => {
      if (!service.value?.id || !selectedBranch.value) return;
      
      await $client.services.updateServiceSourceProps.mutate({
        service_id: service.value.id,
        branchOrRef: selectedBranch.value,
      });
      
      if (selectedRootDir.value !== (service.value.rootDir ?? '/')) {
        await $client.services.updateService.mutate({
          service_id: service.value.id,
          rootDir: selectedRootDir.value,
        });
      }
      
      $posthog().capture('branch_changed', {
        service_id: service.value.id,
        new_branch: selectedBranch.value,
        app_id: applicationSchema.value?.id
      });
      isBranchChanged.value = false;
    }, 'Branch updated.');
  } finally {
    isBranchSaving.value = false;
  }
};

const saveBranchAndRebuild = async () => {
  isBranchSaving.value = true;
  const { $posthog } = useNuxtApp();
  try {
    await saveAndRebuild(async () => {
      if (!service.value?.id || !selectedBranch.value) return;
      
      await $client.services.updateServiceSourceProps.mutate({
        service_id: service.value.id,
        branchOrRef: selectedBranch.value,
      });
      
      if (selectedRootDir.value !== (service.value.rootDir ?? '/')) {
        await $client.services.updateService.mutate({
          service_id: service.value.id,
          rootDir: selectedRootDir.value,
        });
      }
      
      $posthog().capture('branch_changed', {
        service_id: service.value.id,
        new_branch: selectedBranch.value,
        app_id: applicationSchema.value?.id,
        rebuild: true
      });
      isBranchChanged.value = false;
    }, 'Branch updated.');
  } finally {
    isBranchSaving.value = false;
  }
};

const saveAppChanges = async () => {
  if (!applicationSchema.value?.id || !applicationSchema.value?.display_name) return;

  isAppSaving.value = true;
  const { $posthog } = useNuxtApp();

  try {
    await $client.applications.update.mutate({
      application_id: applicationSchema.value.id,
      display_name: applicationSchema.value.display_name,
    });

    $posthog().capture('app_name_changed', {
      app_id: applicationSchema.value.id,
      new_name: applicationSchema.value.display_name
    });

    await refreshApplicationSchema();
    toast.add({ title: 'Application settings saved successfully!', color: 'success' });
  } catch (e: any) {
    toast.add({ title: 'Error saving application settings', description: e.message, color: 'error' });
  } finally {
    isAppSaving.value = false;
  }
};

async function deleteApplicationModal() {
  const applicationDeleteModal = overlay.create(AppApplicationDeleteModal, {
    props: {
      application: applicationSchema.value as any,
      serviceId: service.value?.id as string
    }
  });

  try {
    const result = await applicationDeleteModal.open().result;
    if (result) {
      const { $posthog } = useNuxtApp();
      $posthog().capture('app_deleted', {
        app_id: applicationSchema.value?.id,
        app_name: applicationSchema.value?.display_name,
        stack_type: service.value?.stack_type
      });
    }
  } catch (e) {
    // Modal was cancelled
  }
};
</script>
