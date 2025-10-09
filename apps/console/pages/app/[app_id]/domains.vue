
<template>
  <div>
    <UCard class="mt-4">
      <template #header>
        <h2>Domain Settings</h2>
      </template>

      <div v-if="loading" class="flex items-center space-x-4 px-4 pt-2">
        <USkeleton class="h-8 w-1/3" />
        <USkeleton class="h-8 w-full" />
      </div>
      <div v-else-if="error" class="flex justify-center px-4 pt-2">
        <p class="text-red-500">{{ error.message }}</p>
      </div>

      <div v-else>
        <!-- Domain type selection -->
        <div class="px-4 pt-4">
          <URadioGroup 
            v-model="mode" 
            orientation="horizontal"
            :items="[
              { label: 'Custom DNS', value: 'custom' },
              { label: 'AWS Route53', value: 'route53' }
            ]"
          />
        </div>

        <UForm ref="form" :schema="validationSchema" :state="formState" @submit="saveSettings" class="space-y-4 p-4">
          <!-- Domain field shown for both flows -->
          <UFormField label="Domain" name="domain">
            <div class="flex items-center gap-2">
              <UInput v-model="formState.domain" />
              <UButton v-if="mode === 'route53'" size="sm" :loading="isLookupLoading" @click.prevent="lookupHostedZone">Lookup</UButton>
            </div>
          </UFormField>

          <!-- Route53 specific fields -->
          <template v-if="mode === 'route53'">
            <UFormField label="Hosted Zone ID" name="hosted_zone_id">
              <UInput v-model="formState.hosted_zone_id" />
            </UFormField>

            <UFormField v-if="service?.stack_type === 'SPA' || service?.stack_type === 'WEB_SERVICE'" label="Global Certificate ARN (for CloudFront)" name="global_certificate_arn">
              <UInput v-model="formState.global_certificate_arn" />
            </UFormField>

            <UFormField v-if="service?.stack_type === 'FUNCTION' || service?.stack_type === 'WEB_SERVICE'" label="Regional Certificate ARN (for API Gateway/ALB)" name="regional_certificate_arn">
              <UInput v-model="formState.regional_certificate_arn" />
            </UFormField>
          </template>

          <div class="mt-4 flex items-center gap-3">
            <UButton type="submit" :loading="isSaving" :disabled="!isDirty">Save</UButton>
            <UButton v-if="hasDomain" color="danger" variant="outlined" @click="confirmDelete">Delete</UButton>
            <UButton v-if="hasDomain" variant="text" @click="verifyNow" :loading="isVerifying">Verify</UButton>
          </div>
        </UForm>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { isEqual } from 'lodash-es';
import { z } from 'zod';
import type { Form } from '#ui/types';

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

const originalState = ref({});
const isSaving = ref(false);
const loading = ref(true);
const error = ref<Error | null>(null);
const isDirty = ref(false);

watch(formState, (newState) => {
  isDirty.value = !isEqual(originalState.value, newState);
}, { deep: true });

const fetchDomain = async (serviceId: string) => {
    loading.value = true;
    error.value = null;
  try {
    // fetch via trpc services.listDomain if available, otherwise fallback to supabase
    let domainRow: any = null;
    try {
      const res = await $client.services.listDomain?.query({ service_id: serviceId });
      domainRow = res?.[0] || res || null;
    } catch (err) {
      // fallback to supabase direct read
      const { data, error } = await supabase
        .from('domains')
        .select('domain, global_certificate_arn, regional_certificate_arn, hosted_zone_id, verified')
        .eq('service_id', serviceId)
        .maybeSingle();
      if (error) throw error;
      domainRow = data;
    }

    if (domainRow) {
      formState.domain = domainRow.domain || '';
      formState.global_certificate_arn = domainRow.global_certificate_arn || '';
      formState.regional_certificate_arn = domainRow.regional_certificate_arn || '';
      formState.hosted_zone_id = domainRow.hosted_zone_id || '';
      verifiedState.value = !!domainRow.verified;
    }
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
    fetchDomain(serviceId);
  }
}, { immediate: true });

const environment = computed(() => currentEnvironment.value);
const service = computed(() => currentService.value);

const saveSettings = async () => {
  if (!form.value) return;
  try {
    await form.value.validate();
  } catch (e) {
    return;
  }

    isSaving.value = true;
  try {
    const serviceId = service.value?.id;
    if (!serviceId) {
      throw new Error('Service ID not found.');
    }

    await $client.services.upsertDomain.mutate({
      service_id: serviceId,
      domain: formState.domain,
  hosted_zone_id: formState.hosted_zone_id || null,
  global_certificate_arn: formState.global_certificate_arn || null,
  regional_certificate_arn: formState.regional_certificate_arn || null,
    });
    toast.add({ title: 'Domain settings saved successfully!', color: 'success' });
    await fetchDomain(serviceId);
  } catch (e: any) {
    toast.add({ title: 'Error saving domain settings', description: e.message, color: 'error' });
  } finally {
    isSaving.value = false;
  }
};

// UI helpers & extra actions
const mode = ref<'custom' | 'route53'>('custom');
const isLookupLoading = ref(false);
const isVerifying = ref(false);
const verifiedState = ref(false);

const targetUrl = computed(() => {
  // Determine target URL from service.resources: CloudFrontDistributionUrl, ApiGatewayUrl, LoadBalancerDNS
  const resources = service.value?.resources || {};
  return resources?.CloudFrontDistributionUrl || resources?.ApiGatewayUrl || resources?.LoadBalancerDNS || '';
});

const lookupHostedZone = async () => {
  if (!formState.domain) return;
  if (!environment.value?.provider) {
    toast.add({ title: 'Provider not configured', description: 'No provider associated with this environment.', color: 'warning' });
    return;
  }

  isLookupLoading.value = true;
  try {
    const providerId = environment.value.provider.id;
    const resp = await $client.services.lookupRoute53.query({ provider_id: providerId, domain: formState.domain });
    if (resp?.hosted_zone_id) formState.hosted_zone_id = resp.hosted_zone_id;
    if (resp?.certificates && resp.certificates.length) {
      // pick first candidate for convenience
      formState.global_certificate_arn = resp.certificates[0].arn || formState.global_certificate_arn;
    }
    toast.add({ title: 'Lookup complete', color: 'success' });
  } catch (err: any) {
    toast.add({ title: 'Lookup failed', description: err.message, color: 'error' });
  } finally {
    isLookupLoading.value = false;
  }
};

const verifyNow = async () => {
  if (!formState.domain) return;
  isVerifying.value = true;
  try {
    const res = await $client.services.verifyDomain.mutate({ domain: formState.domain, service_id: service.value?.id });
    if (res.verified) {
      verifiedState.value = true;
      toast.add({ title: 'Domain verified', color: 'success' });
    } else {
      toast.add({ title: 'Not verified', description: 'DNS records not found yet.', color: 'warning' });
    }
  } catch (err: any) {
    toast.add({ title: 'Verification error', description: err.message, color: 'error' });
  } finally {
    isVerifying.value = false;
  }
};

const hasDomain = computed(() => {
  // show Verify/Delete only when a domain is persisted (originalState) rather than as user types
  try {
    const orig = (originalState.value as any) || {};
    return !!orig.domain && String(orig.domain).length > 0;
  } catch (e) {
    return false;
  }
});


const confirmDelete = async () => {
  // simple confirm dialog pattern (keep UI minimal)
  if (!confirm('Delete domain? This will soft-delete the record.')) return;
  try {
    // soft-delete via supabase update for now; can call trpc deleteDomain if added
    const { error } = await supabase.from('domains').update({ deleted_at: new Date() }).eq('service_id', service.value?.id);
    if (error) throw error;
    toast.add({ title: 'Domain deleted', color: 'success' });
    // clear form
    formState.domain = '';
    formState.hosted_zone_id = '';
    formState.global_certificate_arn = '';
    formState.regional_certificate_arn = '';
    verifiedState.value = false;
    originalState.value = JSON.parse(JSON.stringify(formState));
    try { await refreshApplicationSchema(); } catch (e) { /* non-fatal */ }
  } catch (err: any) {
    toast.add({ title: 'Delete failed', description: err.message, color: 'error' });
  }
};
</script>
