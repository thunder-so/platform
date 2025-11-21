
<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <div class="flex items-center justify-between">
          <h2>Custom Domains</h2>
          <div>
            <UButton size="sm" color="primary" @click.prevent="openAddModal">Add new domain</UButton>
          </div>
        </div>
      </template>

      <div v-if="loading" class="flex items-center space-x-4 px-4 pt-2">
        <USkeleton class="h-8 w-1/3" />
        <USkeleton class="h-8 w-full" />
      </div>
      <div v-else-if="error" class="flex justify-center px-4 pt-2">
        <p class="text-red-500">{{ error.message }}</p>
      </div>

      <div v-else>
        <!-- Domains list -->
        <div class="p-4">
          <div v-if="domains.length === 0" class="text-sm text-muted">No domains configured for this environment.</div>
          <ul v-else class="space-y-3">
            <li v-for="d in domains" :key="d.id" class="flex items-start justify-between border border-muted py-5 px-6 rounded">
              <div>
                <div class="flex items-center gap-6">
                  <div class="font-medium">{{ d.domain }}</div>

                  <div class="flex items-center gap-3 p-1.5">
                    <UBadge v-if="d.type === 'route53'" color="info" variant="subtle">ROUTE 53</Ubadge>
                    <UBadge v-else color="success" variant="subtle">CUSTOM DNS</Ubadge>
                    <span v-if="d.type === 'custom'">
                      <UBadge v-if="d.verified" color="success" variant="outline">Verified</UBadge>
                      <UBadge v-else="d.verified" color="warning" variant="outline">Unverified</UBadge>
                    </span>
                  </div>
                </div>
                <div v-if="d.type === 'custom'" class="mt-4 w-full">
                  <p class="text-sm text-muted">Create a CNAME record pointing to 
                    <span class="font-mono">
                      <span v-if="targetUrl">{{ targetUrl }}</span>
                      <span v-else>[Target URL not available yet]</span>
                    </span>
                  </p>
                  <p class="text-sm text-muted mt-2">Once your DNS is configured, verify your settings:</p>
                  <div class="mt-4">
                    <UButton size="sm" color="primary" variant="outline"  @click="verifyDomain(d)" :loading="verifyingId === d.id">Verify</UButton>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <!-- <UButton size="sm" color="danger" variant="outlined" @click="openDelete(d)">Delete</UButton> -->
                <UButton icon="tabler:trash" color="error" variant="ghost" @click="openDelete(d)" />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { isEqual } from 'lodash-es';
import { z } from 'zod';
import type { Form } from '#ui/types';
const overlay = useOverlay();
import { AppDomainDeleteModal, AppDomainAddModal } from '#components';

const validationSchema = z.object({
  domain: z.string().min(1, 'Domain is required.').regex(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/, 'Invalid domain format.').nullable(),
  hosted_zone_id: z.string().nullable().optional(),
  global_certificate_arn: z.string().optional().nullable(),
  regional_certificate_arn: z.string().optional().nullable(),
});

definePageMeta({
  layout: 'app',
});

const { applicationSchema, currentEnvironment, currentService, refreshApplicationSchema } = useApplications();
const { $client } = useNuxtApp();
const supabase = useSupabaseClient();
const toast = useToast();

const form = ref<Form<z.infer<typeof validationSchema>> | null>(null);
const formState = reactive({
  domain: '' as string | null,
  global_certificate_arn: '' as string | null,
  regional_certificate_arn: '' as string | null,
  hosted_zone_id: '' as string | null,
});

const domains = ref<Array<any>>([]);
const showAdd = ref(false);
const lookupNoZone = ref(false);
const verifyingId = ref<string | null>(null);

const originalState = ref({});
const isSaving = ref(false);
const loading = ref(true);
const error = ref<Error | null>(null);
const isDirty = ref(false);

watch(formState, (newState) => {
  isDirty.value = !isEqual(originalState.value, newState);
}, { deep: true });

const fetchDomains = async (serviceId: string) => {
  loading.value = true;
  error.value = null;
  try {
    // trpc listDomain returns array
    let rows: any[] = [];
      try {
      const res = await $client.services.listDomains?.query({ service_id: serviceId });
      rows = res || [];
    } catch (err) {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('service_id', serviceId)
        .is('deleted_at', null);
      if (error) throw error;
      rows = data || [];
    }

    domains.value = rows.map((r: any) => ({
      id: r.id || r.domain,
      domain: r.domain,
      hosted_zone_id: r.hosted_zone_id,
      global_certificate_arn: r.global_certificate_arn,
      regional_certificate_arn: r.regional_certificate_arn,
      verified: !!r.verified,
      type: r.hosted_zone_id ? 'route53' : 'custom'
    }));

    originalState.value = JSON.parse(JSON.stringify(formState));
    isDirty.value = false;
  } catch (e: any) {
    toast.add({ title: 'Error fetching domain settings', description: e.message, color: 'error' });
  } finally {
    loading.value = false;
  }
};

watch(() => currentService.value?.id, (serviceId, old) => {
  if (serviceId && serviceId !== old) {
    fetchDomains(serviceId);
  }
}, { immediate: true });

const environment = computed(() => currentEnvironment.value);
const service = computed(() => currentService.value);

// UI helpers & extra actions
const verifiedState = ref(false);

const targetUrl = computed(() => {
  // Determine target URL from service.resources: CloudFrontDistributionUrl, ApiGatewayUrl, LoadBalancerDNS
  const resources = service.value?.resources || {};
  return resources?.CloudFrontDistributionUrl || resources?.ApiGatewayUrl || resources?.LoadBalancerDNS || '';
});

const openDelete = async (domain: any) => {
  const modal = overlay.create(AppDomainDeleteModal, { props: { domain } });
  try {
    const result = await modal.open().result;
    if (result) {
      try {
        await $client.services.deleteDomain.mutate({ id: result });
        const { $posthog } = useNuxtApp();
        $posthog().capture('domain_deleted', {
          domain: domain.domain,
          service_id: service.value?.id,
          app_id: currentEnvironment.value?.id
        });
        toast.add({ title: 'Domain deleted', color: 'neutral' });
        if (service.value?.id) await fetchDomains(service.value.id);
      } catch (err: any) {
        toast.add({ title: 'Domain deletion error', description: err.message, color: 'error' });
        if (service.value?.id) await fetchDomains(service.value.id);
      }
    }
  } catch (e) {
    // ignore
  }
};

const verifyDomain = async (d: any) => {
  verifyingId.value = d.id;
  const { $posthog } = useNuxtApp();
  try {
    const res = await $client.services.verifyDomain.mutate({ domain: d.domain, service_id: service.value?.id });
    if (res.verified) {
      $posthog().capture('domain_verified', {
        domain: d.domain,
        service_id: service.value?.id,
        app_id: currentEnvironment.value?.id
      });
      toast.add({ title: 'Domain verified', color: 'success' });
    } else {
      $posthog().capture('domain_verification_failed', {
        domain: d.domain,
        service_id: service.value?.id,
        app_id: currentEnvironment.value?.id
      });
      toast.add({ title: 'Not verified', description: 'DNS records not found yet.', color: 'warning' });
    }
  if (service.value?.id) await fetchDomains(service.value.id);
  } catch (err: any) {
    toast.add({ title: 'Verification error', description: err.message, color: 'error' });
  } finally {
    verifyingId.value = null;
  }
};

const openAddModal = async () => {
  const modal = overlay.create(AppDomainAddModal, { props: { service: service.value, environment: environment.value } });
  try {
    const result = await modal.open().result;
    if (result && service.value?.id) {
      const { $posthog } = useNuxtApp();
      $posthog().capture('domain_added', {
        service_id: service.value.id
      });
      await fetchDomains(service.value.id);
    }
  } catch (e) {
    // closed or cancelled
  }
};
</script>
