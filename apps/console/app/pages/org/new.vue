<template>
  <UCard variant="outline">
    <UForm :state="{ orgName, selectedPlan }" @submit.prevent="createOrganization" class="space-y-4">
      <UFormField label="Workspace name" description="A unique identifier for your workspace." name="orgName" class="grid grid-cols-3 gap-4" required>
        <UInput v-model="orgName" placeholder="" class="w-128" size="xl" required autofocus />
      </UFormField>

      <hr class="text-gray-700 mt-6" />

      <div v-if="productsLoading" class="flex items-center justify-center min-h-[calc(48vh)]">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div class="text-sm text-muted">Loading products...</div>
        </div>
      </div>
      
      <PricingTable v-else :plans="products" :selectedPlan="selectedPlan" @update:selectedPlan="selectedPlan = $event" />

      <UAlert v-if="error" color="error" variant="soft" :title="error.message" />
    </UForm>

    <template #footer>
      <UButton @click="createOrganization" :loading="loading" :disabled="!orgName.trim()" size="lg">
        {{ products.find(p => p.id === selectedPlan)?.metadata?.prices?.[0]?.amount_type === 'free' ? 'Create workspace' : 'Continue to payment' }}
      </UButton>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import PricingTable from '~/components/org/PricingTable.vue';
import { usePolar } from '~/composables/usePolar';
import { useMemberships } from '~/composables/useMemberships';

definePageMeta({
  layout: 'blank',
});

const { $client } = useNuxtApp();
const router = useRouter();
const toast = useToast();
const { refreshMemberships, setSelectedOrganization } = useMemberships();

const orgName = ref<string>('');
const { products, isLoading: productsLoading, fetchProducts, isFree } = usePolar();
const selectedPlan = ref<string | undefined>(undefined);
const loading = ref(false);
const error = ref<{ message: string } | null>(null);

fetchProducts().then(() => {
  const freePlan = products.value.find(p => isFree(p));
  selectedPlan.value = freePlan?.id;
});

const createOrganization = async () => {
  if (!selectedPlan.value) {
    error.value = { message: 'Please select a plan' };
    return;
  }

  loading.value = true;
  error.value = null;

  const selected = products.value.find(p => p.id === selectedPlan.value);
  const isFreePlan = isFree(selected);

  const { $posthog } = useNuxtApp();
  $posthog().capture('org_create_started', {
    plan_type: isFreePlan ? 'free' : 'paid',
    plan_id: selectedPlan.value,
    org_name: orgName.value
  });

  try {
    const newOrg = await $client.organizations.create.mutate({
      name: orgName.value,
      planId: selectedPlan.value,
    });

    $posthog().capture('org_created', {
      org_id: newOrg.id,
      plan_type: isFreePlan ? 'free' : 'paid',
      plan_id: selectedPlan.value
    });

    if (isFreePlan) {
      // For free products, direct redirect to dashboard
      await refreshMemberships();
      
      // Explicitly set the new organization as selected
      setSelectedOrganization(newOrg.id);
      
      toast.add({ title: 'Workspace created successfully', color: 'success' });
      await router.push(`/org/${newOrg.id}`);
    } else {
      // For paid products, redirect to checkout
      $posthog().capture('checkout_initiated', {
        org_id: newOrg.id,
        plan_id: selectedPlan.value
      });
      window.location.href = newOrg.checkoutUrl!;
    }
  } catch (e) {
    console.error('Error creating organization:', e);
    $posthog().capture('org_create_failed', {
      error: (e as Error).message,
      plan_id: selectedPlan.value
    });
    error.value = { message: (e as Error).message };
  } finally {
    loading.value = false;
  }
};
</script>
