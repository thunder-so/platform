<template>
  <UModal title="Add domain" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm ref="form" :schema="validationSchema" :state="formState" @submit="submit">

        <URadioGroup v-model="mode" orientation="horizontal" variant="table" :items="radioItems" class="mb-4" />

        <UFormField label="Domain" description="Enter a domain name" name="domain">
            <div class="flex items-center gap-2">
                <UInput v-model="formState.domain" class="w-full" />
                <UButton v-if="mode === 'route53'" size="sm" :loading="isLookupLoading" @click.prevent="lookupHostedZone">Lookup</UButton>
            </div>
        </UFormField>

        <div v-if="mode === 'route53'" class="space-y-4 mt-4">
          <UAlert v-if="lookupNoZone" color="warning" variant="subtle" title="No hosted zone or certificate found for this domain on your AWS account. You can fill the form manually."></UAlert>

          <UFormField label="Hosted Zone ID" name="hosted_zone_id">
            <UInput v-model="formState.hosted_zone_id" class="w-full" />
          </UFormField>

          <UFormField v-if="service?.stack_type === 'SPA' || service?.stack_type === 'WEB_SERVICE'" label="Global Certificate ARN (for CloudFront)" name="global_certificate_arn">
            <UInput v-model="formState.global_certificate_arn" class="w-full" />
          </UFormField>

          <UFormField v-if="service?.stack_type === 'FUNCTION' || service?.stack_type === 'WEB_SERVICE'" label="Regional Certificate ARN (for API Gateway/ALB)" name="regional_certificate_arn">
            <UInput v-model="formState.regional_certificate_arn" class="w-full" />
          </UFormField>
        </div>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton :loading="isSaving" :disabled="!isDirty" color="primary" @click="handleSubmit(close)">Save</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { z } from 'zod';
import { isEqual } from 'lodash-es';
import type { Form } from '#ui/types';

const props = defineProps<{
  service: any
  environment: any
}>()

const emit = defineEmits<{
  saved: [domainId: string]
  close: []
}>()

const validationSchema = z.object({
  domain: z.string().min(1, 'Domain is required.').regex(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/, 'Invalid domain format.').nullable(),
  hosted_zone_id: z.string().nullable().optional(),
  global_certificate_arn: z.string().optional().nullable(),
  regional_certificate_arn: z.string().optional().nullable(),
});

const form = ref<Form<z.infer<typeof validationSchema>> | null>(null);
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

watch(() => ({ ...formState }), (ns) => {
  isDirty.value = !isEqual(originalState.value, ns);
}, { deep: true });

const { $client } = useNuxtApp();
const supabase = useSupabaseClient();
const toast = useToast();

const mode = ref<'custom' | 'route53'>('custom');

const radioItems = computed(() => {
  const hasRoute53 = props.service?.domains?.some((d: any) => d.type === 'route53');
  return [
    { label: 'Custom DNS', value: 'custom', description: 'Use external domain providers.' },
    { label: 'AWS Route53', value: 'route53', description: 'I have a Hosted Zone for this domain name.', disabled: hasRoute53 }
  ];
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
    toast.add({ title: 'Lookup complete', color: 'success' });
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
  } catch (err: any) {
    toast.add({ title: 'Save failed', description: err.message, color: 'error' });
  } finally { isSaving.value = false; }
};

const handleSubmit = async (close: any) => {
  await submit();
  close();
};
</script>
