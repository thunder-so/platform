<template>
  <div>
    <UForm :schema="schema" :state="state" @submit.prevent="updateOrganization" class="space-y-4 max-w-sm">
      <UFormField label="Display Name" name="displayName">
        <UInput v-model="state.displayName" />
      </UFormField>

      <UButton type="submit" :loading="loading">
        Save
      </UButton>
      <p v-if="success" class="text-green-500">Settings saved!</p>
    </UForm>

    <h3 class="mt-8">Danger Zone</h3>
    <div class="border border-red-500 p-4 rounded-md">
      <p class="text-red-500 mb-4">
        Deleting your organization is a permanent action and cannot be undone.
      </p>
      <div v-if="hasApplications" class="text-red-500">
        <p>You cannot delete this organization because it still has applications associated with it.</p>
        <p>Please delete all applications before attempting to delete the organization.</p>
      </div>
      <div v-else-if="hasActiveSubscription" class="text-red-500">
        <p>You cannot delete this organization because it has an active subscription.</p>
        <p>Please cancel your subscription before attempting to delete the organization.</p>
      </div>

      <UModal v-else title="Confirm" description="Are you sure you want to delete this workspace?">
        <UButton label="Delete workspace" color="neutral" variant="subtle" />

        <template #body>
          <p class="mb-4">Your workspace <code>{{ selectedOrganization?.name }}</code> will be deleted along with all settings.</p>
          <p class="mb-4 text-red-700">This action cannot be undone.</p>
        </template>
        <template #footer>
          <div class="flex gap-2">
            <UButton color="neutral" label="Dismiss" @click="emit('close', false)" />
            <UButton color="warning" label="Confirm" @click="deleteOrganization" :loading="deleting" />
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, inject } from 'vue';
import { z } from 'zod';
const { memberships, selectedOrganization, refreshMemberships, initializeSession } = useMemberships()

definePageMeta({
  layout: 'org'
});

const route = useRoute();
const supabase = useSupabaseClient();

const loading = ref(false);
const error = ref(null);
const success = ref(false);
const hasApplications = ref(false);
const confirmDelete = ref(false);
const deleting = ref(false);
const hasActiveSubscription = computed(() => {
  const currentOrgMembership = memberships.value.find(
    (m) => m.id === orgId
  );
  return currentOrgMembership?.status === "active";
});

// const organization = inject('organization');
const orgId = route.params.org_id as string;

const schema = z.object({
  displayName: z.string().min(3, 'Must be at least 3 characters'),
});

const state = reactive({
  displayName: selectedOrganization.value?.name,
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
  loading.value = true;
  success.value = false;
  error.value = null;
  try {
    const { data, error: updateError } = await supabase
      .from('organizations')
      .update({ name: state.displayName })
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
    success.value = true;
    setTimeout(() => success.value = false, 3000);
  } catch (e: any) {
    error.value = e;
  } finally {
    loading.value = false;
  }
};
</script>
