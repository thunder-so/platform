<template>
  <UCard>
    <template #header>
      <h1>New Workspace</h1>
    </template>
    
    <UForm :state="{ orgName, selectedPlan }" @submit.prevent="createOrganization" class="space-y-4">
      <UFormField label="Workspace Name" name="orgName" required>
        <UInput id="org-name" v-model="orgName" type="text" size="xl" required />
      </UFormField>

      <div v-if="plansLoading">Loading plans...</div>
      <PricingTable v-else :plans="plans" :selectedPlan="selectedPlan" @update:selectedPlan="selectedPlan = $event" />

      <UAlert v-if="error" color="error" variant="soft" :title="error.message" />
    </UForm>

    <template #footer>
      <UButton @click="createOrganization" :loading="loading" :disabled="!orgName.trim()" size="lg">
        {{ plans.find(p => p.id === selectedPlan)?.metadata?.prices?.[0]?.amount_type === 'free' ? 'Create workspace' : 'Continue to payment' }}
      </UButton>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import PricingTable from '~/components/org/PricingTable.vue';
import { usePlans } from '~/composables/usePlans';
import { useMemberships } from '~/composables/useMemberships';

definePageMeta({
  layout: 'blank',
});

const { $client } = useNuxtApp();
const router = useRouter();
const toast = useToast();
const { refreshMemberships } = useMemberships();

const orgName = ref<string>('');
const { plans, isLoading: plansLoading, fetchPlans } = usePlans();
const selectedPlan = ref<string | undefined>(undefined);
const loading = ref(false);
const error = ref<{ message: string } | null>(null);

fetchPlans().then(() => {
  const freePlan = plans.value.find(p => p.metadata?.prices?.[0]?.amount_type === 'free');
  selectedPlan.value = freePlan?.id;
});

const createOrganization = async () => {
  if (!selectedPlan.value) {
    error.value = { message: 'Please select a plan' };
    return;
  }

  loading.value = true;
  error.value = null;

  const selected = plans.value.find(p => p.id === selectedPlan.value);
  const isFreePlan = selected?.metadata?.prices?.[0]?.amount_type === 'free';

  try {
    const newOrg = await $client.organizations.create.mutate({
      name: orgName.value,
      planId: selectedPlan.value,
    });

    if (isFreePlan) {
      // For free plans, direct redirect to dashboard
      await refreshMemberships();
      toast.add({ title: 'Workspace created successfully', color: 'success' });
      await router.push(`/org/${newOrg.id}`);
    } else {
      // For paid plans, redirect to checkout
      window.location.href = newOrg.checkoutUrl!;
    }
  } catch (e) {
    console.error('Error creating organization:', e);
    error.value = { message: (e as Error).message };
  } finally {
    loading.value = false;
  }
};
</script>
