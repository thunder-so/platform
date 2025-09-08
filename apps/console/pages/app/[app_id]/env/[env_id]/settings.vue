<template>
  <div>
    <UCard>
      <template #header>
        <h2>Application settings</h2>
      </template>
      <ClientOnly>
        <UForm ref="ApplicationSettingsForm" v-if="applicationSchema" :state="applicationSchema" :validate-on="['input']" class="space-y-4">
          <UFormField label="Application name" name="name" class="grid grid-cols-3 gap-4">
            <UInput v-model="applicationSchema.display_name" class="w-96" size="lg" />
          </UFormField>
        </UForm>
      </ClientOnly>
      <template #footer>
        <div class="flex justify-start">
          <ClientOnly>
            <UButton
              size="lg"
              :loading="isAppSaving"
              :disabled="!isAppChanged"
              @click="saveAppChanges"
            >
              Save Changes
            </UButton>
          </ClientOnly>
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
          <ClientOnly>
            <UButton
              size="lg"
              :loading="isSaving"
              :disabled="!isChanged || hasValidationErrors"
              @click="saveChanges"
            >
              Save Changes
            </UButton>
          </ClientOnly>
        </div>
      </template>
    </UCard>

    <UCard v-if="service" class="mt-4">
      <template #header>
        <h3>Github settings</h3>
      </template>
      <UForm :state="{}" class="space-y-4">
        <UFormField label="Repository" name="repo" class="grid grid-cols-3 gap-4">
          <UInput :model-value="`${service.owner}/${service.repo}`" class="w-96" size="lg" disabled />
        </UFormField>
        <UFormField label="Branch" name="branch" class="grid grid-cols-3 gap-4">
          <ClientOnly>
            <USelect v-model="selectedBranch" :items="branchItems" class="w-96" size="lg" />
          </ClientOnly>
        </UFormField>
      </UForm>
      <template #footer>
        <div class="flex justify-start">
          <ClientOnly>
            <UButton
              size="lg"
              :loading="isBranchSaving"
              :disabled="!isBranchChanged"
              @click="saveBranch"
            >
              Save Changes
            </UButton>
          </ClientOnly>
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
const { $client } = useNuxtApp();
const router = useRouter();
const toast = useToast();

const localServiceConfig = ref<ServiceSchema | null>(null);
const isSaving = ref(false);
const isChanged = ref(false);
const isAppSaving = ref(false);
const isAppChanged = ref(false);
const originalDisplayName = ref<string>('');
const error = ref<string | null>(null);

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
});

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
    toast.add({ title: 'Settings saved successfully!', color: 'success' });
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
    toast.add({ title: 'Branch updated successfully!', color: 'success' });
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
