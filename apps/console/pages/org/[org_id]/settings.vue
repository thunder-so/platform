<template>
  <div>
    <UCard>
      <template #header>
        <h3>Workspace Settings</h3>
      </template>
      <UForm :schema="schema" :state="state" @submit.prevent="updateOrganization" class="space-y-4 max-w-sm">
        <UFormField label="Display Name" name="newDisplayName">
          <UInput v-model="state.newDisplayName" />
        </UFormField>
      </UForm>

      <template #footer>
        <UButton 
          type="submit" 
          @click="updateOrganization" 
          :loading="submitButton" 
          :disabled="submitButton || !isFormValid || !hasChanges">
          Update
        </UButton>
      </template>
    </UCard>

    <UCard color="error" class="mt-8">
      <template #header>
        <h3>Danger Zone</h3>
      </template>
      <div v-if="loading">
        <div class="flex flex-col gap-4">
          <USkeleton class="h-12 w-full" />
        </div>
      </div>
      <div v-else-if="error">
        <UAlert color="error" variant="soft" :title="error.message" class="mb-4" />
      </div>
      <div v-else-if="hasApplications">
        <UAlert 
          color="error" 
          variant="soft" 
          class="mb-4"
          title="You cannot delete this organization because it still has applications associated with it."
          description="Please delete all applications before attempting to delete the organization." 
        />
      </div>
      <div v-else-if="hasActiveSubscription">
        <UAlert 
          color="error" 
          variant="soft" 
          class="mb-4"
          title="You cannot delete this organization because it has an active subscription."
          description="Please cancel your subscription before attempting to delete the organization." 
        />
      </div>
      <div v-else>
        <UAlert 
          color="error" 
          variant="soft" 
          class="mb-4"
          title="Deleting your workspace is a permanent action and cannot be undone." 
        />
        <UButton @click="deleteOrganizationModal()" variant="outline" color="error">
          Delete Workspace
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, inject } from 'vue';
import { z } from 'zod';
import { OrganizationDeleteModal } from '#components'

const { memberships, selectedOrganization, initializeSession } = useMemberships()

definePageMeta({
  layout: 'org'
});

const supabase = useSupabaseClient();
const toast = useToast();
const submitButton = ref(false);
const loading = ref(true);
const error = ref<{ message: string } | null>(null);
const hasApplications = ref(false);
const confirmDelete = ref(false);
const deleting = ref(false);
const hasActiveSubscription = computed(() => {
  const currentOrgMembership = memberships.value.find(
    (m) => m.id === orgId
  );
  return currentOrgMembership?.status === "active";
});
const isFormValid = computed(() => {
  return state.newDisplayName && state.newDisplayName.length >= 3;
});

const hasChanges = computed(() => {
  return state.newDisplayName !== selectedOrganization.value?.name;
});

const orgId = selectedOrganization.value?.id as string;

const overlay = useOverlay()
const organizationDeleteModal = overlay.create(OrganizationDeleteModal, {
  props: {org: selectedOrganization.value}
});

async function deleteOrganizationModal() {
  const result = await organizationDeleteModal.open().result;

  if (result === orgId) {
    await deleteOrganization();
  }
}

const schema = z.object({
  newDisplayName: z.string()
    .min(3, 'Must be at least 3 characters')
    .regex(/^[a-zA-Z0-9 ]+$/, 'Only letters, numbers, and spaces are allowed'),
})

const state = reactive({
  newDisplayName: selectedOrganization.value?.name,
});

onMounted(async () => {
  await checkApplications();
});

const checkApplications = async () => {
  try {
    const { count, error: fetchError } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (fetchError) throw fetchError;
    hasApplications.value = count > 0;
  } catch (e: any) {
    console.error("Error checking applications:", e.message);
  } finally {
    loading.value = false;
  }
};

const deleteOrganization = async () => {
  deleting.value = true;
  try {
    const { $client } = useNuxtApp();
    await $client.organizations.delete.mutate({ orgId });
    confirmDelete.value = false;
    await initializeSession();
    await navigateTo('/');
  } catch (e: any) {
    console.error("Error deleting organization:", e);
    alert("Failed to delete organization: " + e.message);
  } finally {
    deleting.value = false;
  }
};

const updateOrganization = async () => {
  submitButton.value = true;
  error.value = null;
  try {
    const { data, error: updateError } = await supabase
      .from('organizations')
      .update({ name: state.newDisplayName })
      .eq('id', orgId)
      .select('id, name')
      .single();

    if (data && selectedOrganization) {
      // organization.value.name = data.name;
      selectedOrganization.value = data;
      // refreshMemberships();
      await initializeSession();
    }

    if (updateError) throw updateError;
    toast.add({
      title: 'Organization updated successfully.',
      color: 'success',
    });
    setTimeout(() => success.value = false, 3000);
  } catch (e: any) {
    error.value = e;
  } finally {
    submitButton.value = false;
  }
};
</script>
