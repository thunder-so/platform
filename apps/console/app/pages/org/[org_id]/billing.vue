<template>
  <div>
    <UAlert v-if="error" color="warning" variant="soft" :title="error.message" class="mb-4" />
    <div v-if="isPageLoading">
      <div class="flex flex-col gap-4">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <USkeleton class="h-12 w-full" />
        </div>
      </div>
    </div>
    <div v-else>
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3>Billing information</h3>
            <UButton v-if="subscription" @click="manageSubscription" color="neutral" variant="outline" :loading="isManagingSubscription">
              Manage Subscription
            </UButton>
          </div>
        </template>

        <div class="flex items-top gap-4">
          <div class="flex-1 ml-3">
            <div class="grid grid-cols-3 gap-2 w-full mb-4">
              <div class="flex flex-col text-left">
                <h4>Plan</h4>
                <p class="text-sm text-muted">{{ subscription?.metadata?.product?.name || 'No active plan' }}</p>
              </div>

              <div v-if="subscription" class="flex flex-col text-left">
                <h4>Status</h4>
                <div>
                  <UBadge v-if="subscription.status === 'active'" color="success" variant="subtle">ACTIVE</UBadge>
                  <UBadge v-else-if="subscription.status === 'trialing'" color="info" variant="subtle">TRIAL</UBadge>
                  <UBadge v-else-if="subscription.status === 'past_due'" color="warning" variant="subtle">PAST DUE</UBadge>
                  <UBadge v-else-if="subscription.status === 'canceled'" color="warning" variant="subtle">CANCELLED</UBadge>
                  <UBadge v-else-if="subscription.status === 'unpaid'" color="warning" variant="subtle">UNPAID</UBadge>
                  <UBadge v-else color="warning" variant="subtle">{{ subscription.status }}</UBadge>
                </div>
              </div>
            </div>

            <div v-if="subscription" class="grid grid-cols-3 gap-2 w-full">
              <div class="flex flex-col text-left">
                <h4>{{ isTrialing ? 'Trial ends' : 'Billing cycle' }}</h4>
                <p v-if="isTrialing" class="text-sm text-muted font-medium text-info">
                  {{ formatDate(subscription.current_period_end) }}
                </p>
                <p v-else class="text-sm text-muted">
                  {{ formatDate(subscription.current_period_start) }} – {{ formatDate(subscription.current_period_end) }}
                </p>
              </div>
            </div>

            <div v-if="!subscription" class="mt-4">
              <UButton @click="goToNewOrg" color="primary" size="md">Subscribe to Pro</UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <ClientOnly>
      <UCard class="mt-4">
        <template #header>
          <p>Plans and pricing</p>
        </template>

        <BillingPricingTable
          v-if="products.length > 0"
          :plans="products as any"
          :selectedPlan="selectedPlan"
          :currentPlan="subscription?.metadata?.product?.id"
          @update:selectedPlan="selectedPlan = $event"
        />

        <template #footer>
          <UButton
            @click="subscribeToPlan"
            :disabled="!isPlanChangeValid"
            :loading="isCreatingCheckout"
            size="lg"
          >
            Change plan
          </UButton>
        </template>
      </UCard>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import BillingPricingTable from '~/components/org/BillingPricingTable.vue';
import { usePolar } from '~/composables/usePolar';
import type { SubscriptionWithMetadata } from '~~/server/db/schema';

const { selectedOrganization } = useMemberships()
const { $client } = useNuxtApp()
const { products, isLoading: productsLoading, fetchProducts, isTrialing: isTrialingFn } = usePolar();
const toast = useToast();
const router = useRouter();

definePageMeta({
  layout: 'org',
})

const orgId = selectedOrganization.value?.id as string;
const subscription = computed((): SubscriptionWithMetadata | null => {
  return selectedOrganization.value?.subscriptions?.find(
    sub => sub.status === 'active' || sub.status === 'trialing'
  ) as SubscriptionWithMetadata || null;
});

const isLoading = ref(false)
const error = ref<{ message: string } | null>(null);
const selectedPlan = ref<string | undefined>(undefined);
const isPageLoading = computed(() => isLoading.value || productsLoading.value);
const isCreatingCheckout = ref(false);
const isManagingSubscription = ref(false);

const isTrialing = computed(() => isTrialingFn(subscription.value));

const isPlanChangeValid = computed(() => {
  const currentPlanId = subscription.value?.metadata?.product?.id;
  return selectedPlan.value && selectedPlan.value !== currentPlanId;
});

const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const subscribeToPlan = async () => {
  if (!selectedPlan.value) return;

  const currentPlanId = subscription.value?.metadata?.product?.id;
  const { $posthog } = useNuxtApp();

  $posthog().capture('billing_plan_change_started', {
    from_plan: currentPlanId,
    to_plan: selectedPlan.value,
    org_id: orgId,
  });

  isCreatingCheckout.value = true;
  try {
    const { checkoutUrl } = await $client.organizations.createCheckoutSession.mutate({
      organizationId: orgId,
      productId: selectedPlan.value,
      plan_change: true,
    });
    $posthog().capture('checkout_initiated', {
      from_plan: currentPlanId,
      to_plan: selectedPlan.value,
      org_id: orgId,
      plan_change: true,
    });
    window.location.href = checkoutUrl;
  } catch (e) {
    console.error('Error changing plan:', e);
    $posthog().capture('billing_plan_change_failed', {
      from_plan: currentPlanId,
      to_plan: selectedPlan.value,
      error: (e as Error).message,
      org_id: orgId,
    });
    error.value = { message: 'Failed to change plan. Please try again.' };
  } finally {
    isCreatingCheckout.value = false;
  }
};

const goToNewOrg = () => router.push('/org/new');

onMounted(async () => {
  await fetchProducts();
  selectedPlan.value = subscription.value?.metadata?.product?.id;
});

const manageSubscription = async () => {
  isManagingSubscription.value = true;
  try {
    const { $posthog } = useNuxtApp();
    $posthog().capture('billing_portal_accessed', {
      org_id: orgId,
      current_plan: subscription.value?.metadata?.product?.id,
    });
    const { url } = await $client.organizations.createPortalSession.mutate({ organizationId: orgId });
    window.location.href = url;
  } catch (e) {
    console.error('Failed to get subscription management URL:', e);
    error.value = { message: 'Failed to get subscription management URL.' };
  } finally {
    isManagingSubscription.value = false;
  }
}
</script>
