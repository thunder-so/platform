<template>
  <div>
    <Header />

    <UContainer>
      <h1>Create New Organization</h1>
      <ClientOnly>
        <UForm :state="{ orgName, selectedPlan }" @submit.prevent="createOrganization" class="space-y-4">
          <UInput id="org-name" v-model="orgName" type="text" required />

          <PricingTable :plans="plans" :selectedPlan="selectedPlan" @update:selectedPlan="selectedPlan = $event" />

          <UButton type="submit" :loading="loading" :disabled="!orgName.trim()" block size="lg">
            {{ loading ? 'Creating...' : 'Continue' }}
          </UButton>
          <UAlert v-if="error" variant="solid" :title="error.message" />
        </UForm>
      </ClientOnly>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const { $client } = useNuxtApp();
const router = useRouter();
const toast = useToast();
import PricingTable from '~/components/PricingTable.vue';
import type { Plan } from '~/types';
const appConfig = useAppConfig();

definePageMeta({
  // layout: '',
});

const orgName = ref('');
// Assuming plans in app.config.ts have name, id, description, and price
const plans = ref<Plan[]>(appConfig.plans);
const selectedPlan = ref(plans.value.find(p => p.productId === null)?.id || plans.value[0]?.id);
const loading = ref(false);
const error = ref<{ message: string } | null>(null);

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
