<template>
  <UModal title="Add domain" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm ref="form" :schema="validationSchema" :state="formState" @submit.prevent="submit">

        <URadioGroup v-model="mode" orientation="horizontal" variant="table" :items="radioItems" class="mb-4" />

        <UFormField label="Domain" description="Enter a domain name" name="domain">
          <div class="flex items-center gap-2">
              <UInput v-model="formState.domain" class="w-full" @blur="validateDomain" />
              <UButton v-if="mode === 'route53'" size="sm" :loading="isLookupLoading" @click.prevent="lookupHostedZone">Lookup</UButton>
          </div>
          <p v-if="!isDomainValid" class="mt-2 text-error text-sm">Duplicate domain</p> 
        </UFormField>

        <div v-if="mode === 'route53'" class="space-y-4 mt-4">
          <UAlert v-if="lookupNoZone" color="warning" variant="subtle" title="No hosted zone or certificate found for this domain on your AWS account. You can fill the form manually."></UAlert>

          <UFormField label="Hosted Zone ID" description="Find the hosted zone of your domain." name="hosted_zone_id">
            <UInput v-model="formState.hosted_zone_id" class="w-full" />
          </UFormField>

          <UFormField v-if="service?.stack_type === 'SPA' || service?.stack_type === 'WEB_SERVICE'" label="Global Certificate ARN" description="The ARN of the global certificate issued for your domain in us-east-1. Required for CloudFront." name="global_certificate_arn">
            <UInput v-model="formState.global_certificate_arn" class="w-full" />
          </UFormField>

          <UFormField v-if="service?.stack_type === 'FUNCTION' || service?.stack_type === 'WEB_SERVICE'" label="Regional Certificate ARN"  description="The ARN of the regional certificate issued for your domain in the same region as this environment. Required for API Gateway/ALB." name="regional_certificate_arn">
            <UInput v-model="formState.regional_certificate_arn" class="w-full" />
          </UFormField>
        </div>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton :loading="isSaving" :disabled="!isDirty || !formIsValid || !isDomainValid" color="primary" @click="handleSubmit()">Save</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { z } from 'zod';
import { isEqual } from 'lodash-es';
import type { Form } from '#ui/types';

const props = defineProps<{
  service: any
  environment: any
}>()

const emit = defineEmits<{
  saved: [domainId: string]
  close: [boolean]
}>()

const mode = ref<'custom' | 'route53'>('custom');

const validationSchema = computed(() => {
  const domain = z.string().min(1, 'Domain is required.').regex(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/, 'Invalid domain format.');

  // Hosted zone required when Route53 mode
  const hostedZone = mode.value === 'route53'
    ? z.string().min(1, 'Hosted Zone ID is required for Route53')
    : z.string().nullable().optional();

  // Certificates conditionally required when Route53 + matching stack types
  let globalCert: any = z.string().optional().nullable();
  let regionalCert: any = z.string().optional().nullable();
  const st = props.service?.stack_type;
  if (mode.value === 'route53') {
    if (st === 'SPA' || st === 'WEB_SERVICE') {
      globalCert = z.string().min(1, 'Global certificate ARN is required for this stack type');
    }
    if (st === 'FUNCTION' || st === 'WEB_SERVICE') {
      regionalCert = z.string().min(1, 'Regional certificate ARN is required for this stack type');
    }
  }

  return z.object({
    domain: domain.nullable(),
    hosted_zone_id: hostedZone.nullable().optional(),
    global_certificate_arn: globalCert.optional().nullable(),
    regional_certificate_arn: regionalCert.optional().nullable(),
  });
});

type DomainFormData = {
  domain: string | null;
  hosted_zone_id?: string | null;
  global_certificate_arn?: string | null;
  regional_certificate_arn?: string | null;
};

const form = ref<Form<DomainFormData> | null>(null);
const formState = reactive({
  domain: '' as string | null,
  global_certificate_arn: '' as string | null,
  regional_certificate_arn: '' as string | null,
  hosted_zone_id: '' as string | null,
});

const originalState = ref({});
const isSaving = ref(false);
const isLookupLoading = ref(false);
const lookupNoZone = ref(false);
const isDirty = ref(false);
const isDomainValid = ref(true);
const domainError = ref('');

watch(() => ({ ...formState }), (ns) => {
  isDirty.value = !isEqual(originalState.value, ns);
}, { deep: true });

const { $client } = useNuxtApp();
const supabase = useSupabaseClient();
const toast = useToast();

const serviceDomains = ref<Array<any>>([]);

const fetchServiceDomains = async (serviceId?: string) => {
  if (!serviceId) {
    serviceDomains.value = [];
    return;
  }
  try {
    const res = await $client.services.listDomains.query({ service_id: serviceId });
    serviceDomains.value = Array.isArray(res) ? res : (res ? [res] : []);
    console.log('Fetched service domains:', serviceDomains.value);
  } catch (e) {
    // Best-effort — server validation will still enforce uniqueness
    serviceDomains.value = [];
  }
};

watch(() => props.service?.id, (id) => {
  if (id) fetchServiceDomains(id as string);
}, { immediate: true });

onMounted(() => {
  if (props.service?.id) fetchServiceDomains(props.service.id);
});

const radioItems = computed(() => {
  const hasRoute53 = Array.isArray(serviceDomains.value) && serviceDomains.value.some((d: any) => d.type === 'route53');
  return [
    { label: 'Custom DNS', value: 'custom', description: 'Use external domain providers.' },
    { label: 'AWS Route53', value: 'route53', description: 'I have a Hosted Zone for this domain name.', disabled: hasRoute53 }
  ];
});

const validateDomain = async () => {
  isDomainValid.value = true;
  domainError.value = '';
  const val = String(formState.domain || '').toLowerCase().trim();
  if (!val) {
    domainError.value = 'Domain is required.';
    return;
  }
  // client-side duplicate check (case-insensitive) against fetched serviceDomains
  if (Array.isArray(serviceDomains.value)) {
    const dup = serviceDomains.value.find((d: any) => String(d.domain || '').toLowerCase().trim() === val && !d.deleted_at);
    if (dup) {
      isDomainValid.value = false;
      domainError.value = 'This domain is already configured for the service.';
      return;
    }
  }
};

const formIsValid = computed(() => {
  try {
    const schema = (validationSchema as any).value as any;
    const res = schema.safeParse(formState as any);
    return res.success;
  } catch {
    return false;
  }
});

const lookupHostedZone = async () => {
  if (!formState.domain) return;
  if (!props.environment?.provider) { toast.add({ title: 'Provider not configured', description: 'No provider associated with this environment.', color: 'warning' }); return; }
  isLookupLoading.value = true;
  try {
    const providerId = props.environment.provider.id;
    const resp = await $client.services.lookupRoute53.query({ provider_id: providerId, domain: formState.domain });
    if (resp?.hosted_zone_id) {
      formState.hosted_zone_id = resp.hosted_zone_id;
      lookupNoZone.value = false;
    } else {
      lookupNoZone.value = true;
    }
    if (resp?.certificates && Array.isArray(resp.certificates) && resp.certificates.length) {
      formState.global_certificate_arn = resp.certificates[0]?.arn || formState.global_certificate_arn;
    }
    toast.add({ title: 'Lookup complete', color: 'neutral' });
  } catch (err: any) {
    toast.add({ title: 'Lookup failed', description: err.message, color: 'error' });
    lookupNoZone.value = true;
  } finally {
    isLookupLoading.value = false;
  }
};

const submit = async () => {
  if (!form.value) return;
  try { await form.value.validate(); } catch (e) { return; }
  isSaving.value = true;
  try {
    const serviceId = props.service?.id;
    if (!serviceId) throw new Error('Service ID missing');
    // final domain validation before submit
    await validateDomain();
    if (!isDomainValid.value) {
      throw new Error(domainError.value || 'Invalid domain');
    }
    const res = await $client.services.insertDomain.mutate({
      service_id: serviceId,
      domain: formState.domain as string,
      hosted_zone_id: formState.hosted_zone_id || null,
      global_certificate_arn: formState.global_certificate_arn || null,
      regional_certificate_arn: formState.regional_certificate_arn || null,
    });
    toast.add({ title: 'Domain added', color: 'success' });
    // normalize result which can be an array (returning()) or single object
    let createdId = '';
    if (Array.isArray(res)) {
      createdId = res[0]?.id || '';
    } else if (res && typeof res === 'object') {
      createdId = (res as any).id || '';
    }
    emit('saved', createdId);
    emit('close', true);
  } catch (err: any) {
    toast.add({ title: 'Save failed', description: err.message, color: 'error' });
  } finally { isSaving.value = false; }
};

const handleSubmit = async () => {
  await submit();
};
</script>
