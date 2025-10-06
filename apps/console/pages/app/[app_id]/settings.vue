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

    <UCard v-if="service" class="mt-4">
      <template #header>
        <h3>Github settings</h3>
      </template>
      <UForm :state="{}" class="space-y-6">
        <UFormField label="Repository" description="Github account and repository." name="repo" class="grid grid-cols-3 gap-4">
          <UInput :model-value="`${service.owner}/${service.repo}`" class="w-96" size="lg" disabled />
        </UFormField>
        <UFormField label="Branch" description="Repository branch used for this deployment." name="branch" class="grid grid-cols-3 gap-4">
          <USelect v-model="selectedBranch" :items="branchItems" class="w-96" size="lg" />
        </UFormField>
      </UForm>
      <template #footer>
        <div class="flex justify-start">
          <UButton
            size="lg"
            :loading="isBranchSaving"
            :disabled="!isBranchChanged"
            @click="saveBranch"
          >
            Save Changes
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- <UCard v-if="applicationSchema" class="mt-8">
      <template #header>
        <h3>Notification Settings</h3>
      </template>
      <div class="space-y-4">
        <div v-for="type in notificationTypes" :key="type.value">
          <UCheckbox 
            v-model="notificationPreferences[type.value]" 
            :label="type.label"
            :description="type.description"
          />
        </div>
      </div>
      <template #footer>
        <UButton 
          @click="saveNotificationPreferences" 
          :loading="savingNotificationPreferences"
          :disabled="!hasNotificationChanges">
          Save Preferences
        </UButton>
      </template>
    </UCard> -->

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
import { AppApplicationDeleteModal } from '#components'
import { ref, computed, watch, onMounted } from 'vue';
import AppServiceConfiguration from '~/components/app/ServiceConfiguration.vue';
import type { ServiceSchema } from '~/server/validators/app';
import { isEqual } from 'lodash-es';
import { useNavigationGuard } from '~/composables/useNavigationGuard';
import type { Branch } from '~/server/db/schema';

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
const isSaving = ref(false);
const isChanged = ref(false);
const isAppSaving = ref(false);
const isAppChanged = ref(false);
const originalDisplayName = ref<string>('');
const error = ref<string | null>(null);
const toast = useToast();

const serviceConfigForm = ref<{ hasErrors: boolean } | null>(null);
const hasValidationErrors = computed(() => serviceConfigForm.value?.hasErrors || false);

const isBranchSaving = ref(false);
const isBranchChanged = ref(false);
const branches = ref<Branch[]>([]);
const branchItems = computed(() => branches.value.map(b => ({ value: b.name, label: b.name })));
const selectedBranch = ref<string>('');

const isDirty = computed(() => isChanged.value || isAppChanged.value || isBranchChanged.value);

useNavigationGuard(isDirty);

const fetchBranches = async () => {
  if (service.value?.owner && service.value?.repo && service.value?.installation_id) {
    try {
      const branchData = await $client.github.getBranches.query({
        owner: service.value.owner,
        repo: service.value.repo,
        installation_id: service.value.installation_id,
      });
      branches.value = branchData;
    } catch (e) {
      console.error('Failed to fetch branches', e);
      toast.add({ title: 'Error fetching branches', color: 'error' });
    }
  }
};

watch(service, async (newService) => {
  if (newService) {
    localServiceConfig.value = JSON.parse(JSON.stringify(newService));
    if (newService.branch) {
      selectedBranch.value = newService.branch;
    }
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
  if (service.value && newConfig) {
    isChanged.value = !isEqual(service.value, newConfig);
  }
}, { deep: true });

watch(selectedBranch, (newBranch) => {
  if (service.value?.branch) {
    isBranchChanged.value = newBranch !== service.value.branch;
  }
});

onMounted(() => {
  fetchBranches();
  // loadNotificationPreferences();
});

async function loadNotificationPreferences() {
  const { data } = await supabase
    .from('environment_notifications')
    .select('type, enabled')
    .eq('environment_id', envId);

  notificationTypes.forEach(type => {
    notificationPreferences.value[type.value] = false;
  });

  data?.forEach(pref => {
    notificationPreferences.value[pref.type] = pref.enabled;
  });

  originalNotificationPreferences.value = { ...notificationPreferences.value };
}

async function saveNotificationPreferences() {
  savingNotificationPreferences.value = true;
  
  try {
    const records = Object.entries(notificationPreferences.value).map(([type, enabled]) => ({
      environment_id: envId,
      type,
      enabled
    }));

    await supabase
      .from('environment_notifications')
      .upsert(records);

    originalNotificationPreferences.value = { ...notificationPreferences.value };

    toast.add({
      title: 'Notification preferences saved successfully',
      color: 'success'
    });
  } catch (error) {
    toast.add({
      title: 'Failed to save notification preferences',
      color: 'error'
    });
  } finally {
    savingNotificationPreferences.value = false;
  }
}

const isBuildTriggering = ref(false);

const triggerBuild = async () => {
  if (!service.value?.id) return;
  isBuildTriggering.value = true;
  try {
    const build = await $client.services.triggerBuild.mutate({ service_id: service.value.id });
    toast.add({ 
      title: 'Build triggered.', 
      description: "Click to view build details and logs.",
      color: 'success',
      progress: false,
      duration: 0,
      actions: [{
        label: 'View Build',
        color: 'primary',
        size: 'lg',
        to: `/app/${applicationSchema.value?.id}/builds/${build.id}`
      }]
    });
  } catch (e: any) {
    toast.add({ title: 'Error triggering build', description: e.message, color: 'error' });
  } finally {
    isBuildTriggering.value = false;
  }
};

const saveChanges = async () => {
  if (!localServiceConfig.value?.metadata) return;

  isSaving.value = true;
  error.value = null;

  try {
    const { stack_type, id } = localServiceConfig.value;

    await $client.services.updateServiceMetadata.mutate({
      service_id: id,
      stack_type,
      metadata: localServiceConfig.value.metadata,
    });

    await refreshApplicationSchema();
    toast.add({ 
      title: 'Settings saved.',
      description: 'Rebuild your service to apply changes.', 
      color: 'success',
      progress: false,
      duration: 0,
      actions: [{
        label: 'Rebuild',
        color: 'primary',
        size: 'lg',
        loading: isBuildTriggering.value,
        onClick: () => triggerBuild()
      }]
    });
  } catch (e: any) {
    error.value = e.message;
    toast.add({ title: 'Error saving settings', description: e.message, color: 'error' });
  } finally {
    isSaving.value = false;
  }
};

const saveBranch = async () => {
  if (!service.value?.id || !selectedBranch.value) return;

  isBranchSaving.value = true;
  try {
    await $client.services.updateService.mutate({
      service_id: service.value.id,
      branch: selectedBranch.value,
    });
    await refreshApplicationSchema();
    isBranchChanged.value = false;
    toast.add({ 
      title: 'Branch updated.', 
      description: 'Rebuild your service to apply changes.', 
      color: 'success',
      progress: false,
      duration: 0,
      actions: [{
        label: 'Rebuild',
        color: 'primary',
        size: 'lg',
        loading: isBuildTriggering.value,
        onClick: () => triggerBuild()
      }]
    });
  } catch (e: any) {
    toast.add({ title: 'Error updating branch', description: e.message, color: 'error' });
  } finally {
    isBranchSaving.value = false;
  }
};

const saveAppChanges = async () => {
  if (!applicationSchema.value?.id || !applicationSchema.value?.display_name) return;

  isAppSaving.value = true;
  error.value = null;

  try {
    await $client.applications.update.mutate({
      application_id: applicationSchema.value.id,
      display_name: applicationSchema.value.display_name,
    });

    await refreshApplicationSchema();
    toast.add({ title: 'Application settings saved successfully!', color: 'success' });
  } catch (e: any) {
    error.value = e.message;
    toast.add({ title: 'Error saving application settings', description: e.message, color: 'error' });
  } finally {
    isAppSaving.value = false;
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
      application_id: applicationSchema.value?.id as string,
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
