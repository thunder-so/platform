<template>
  <div>
    <Header />

    <UContainer class="mt-12">
      <UCard>
        <template #header>
          <h1>Create New Organization</h1>
        </template>
        
        <UForm :state="{ orgName, selectedPlan }" @submit.prevent="createOrganization" class="space-y-4">
          <UFormField label="Organization Name" name="orgName" required>
            <UInput id="org-name" v-model="orgName" type="text" size="xl" required />
          </UFormField>

          <div v-if="plansLoading">Loading plans...</div>
          <PricingTable v-else :plans="plans" :selectedPlan="selectedPlan" @update:selectedPlan="selectedPlan = $event" />

          <UAlert v-if="error" color="error" variant="soft" :title="error.message" />
        </UForm>

        <template #footer>
          <UButton @click="createOrganization" :loading="loading" :disabled="!orgName.trim()" size="lg">
            {{ selectedPlan === 'free' ? 'Create organization' : 'Continue to payment' }}
          </UButton>
        </template>
      </UCard>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import PricingTable from '~/components/PricingTable.vue';
import { usePlans, type Plan } from '~/composables/usePlans';

definePageMeta({
  // layout: '',
});

const { $client } = useNuxtApp();
const router = useRouter();
const toast = useToast();

const orgName = ref<string>('');
const { plans, isLoading: plansLoading, fetchPlans } = usePlans();
const selectedPlan = ref<string | undefined>(undefined);
const loading = ref(false);
const error = ref<{ message: string } | null>(null);

fetchPlans().then(() => {
  selectedPlan.value = 'free';
});

const createOrganization = async () => {
  if (!selectedPlan.value) {
    error.value = { message: 'Please select a plan' };
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const newOrg = await $client.organizations.create.mutate({
      name: orgName.value,
      planId: selectedPlan.value,
    });

    if (newOrg.checkoutUrl) {
      // For paid plans, redirect to the Polar checkout page
      window.location.href = newOrg.checkoutUrl;
    } else {
      // For free plans, redirect to the new organization's dashboard
      // Await is important here for navigation to complete before potential cleanup.
      toast.add({ title: 'Organization created successfully', color: 'success' });
      await router.push(`/org/${newOrg.id}`);
    }
  } catch (e) {
    console.error('Error creating organization:', e);
    error.value = { message: (e as Error).message };
  } finally {
    loading.value = false;
  }
};
</script>
