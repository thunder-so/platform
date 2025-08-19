<template>
    <ClientOnly v-if="!isLoading">
      <UCard>
        <pre>{{ applicationSchema }}</pre>
      </UCard>
      <UCard class="mt-6">
        <template #header>
          <h1>Configure application</h1>
        </template>

        <div class="space-y-4">
          <UAlert v-if="providerError" color="error" variant="subtle" class="mb-4" :title="providerError" />

          <div v-if="applicationSchema.environments" class="space-y-4">
            <UForm :state="applicationSchema" class="space-y-4">
            <!-- <UForm :state="applicationSchema" :schema="applicationInputSchema" :validate-on="['input']" class="space-y-4"> -->
              <UFormField label="Repository" class="grid grid-cols-3 gap-4">
                <UInput 
                  disabled 
                  size="lg" 
                  variant="outline"
                  class="w-full"
                > 
                  <template #leading>
                    <p class="flex items-center">
                      <Icon name="mdi:github" class="w-5 h-5 text-muted mr-2" />
                      <span class="text-sm text-muted">{{applicationSchema.environments?.[0]?.services?.[0]?.pipeline_props?.sourceProps?.owner}}/{{applicationSchema.environments?.[0]?.services?.[0]?.pipeline_props?.sourceProps?.repo}}</span>
                    </p>
                  </template>
                </UInput>
              </UFormField>

              <UFormField label="Branch" class="grid grid-cols-3 gap-4">
                <USelect 
                  v-model="applicationSchema.environments[0].services[0].pipeline_props.sourceProps.branchOrRef" 
                  :items="branchItems" 
                  class="w-96" size="lg"
                />
              </UFormField>

              <UFormField label="Application Name" class="grid grid-cols-3 gap-4">
                <UInput v-model="applicationSchema.display_name" size="lg" class="w-96" />
              </UFormField>

              <UFormField label="Environment Name" class="grid grid-cols-3 gap-4">
                <UInput v-model="applicationSchema.environments[0].display_name" size="lg" class="w-96" />
              </UFormField>

              <UFormField label="AWS Account" class="grid grid-cols-3 gap-4">
                <USelect 
                  v-model="selectedProviderId" 
                  :items="providerItems" 
                  class="w-96" size="lg"
                />
              </UFormField>

              <UFormField label="Region" class="grid grid-cols-3 gap-4">
                <USelect 
                  v-model="applicationSchema.environments[0].region" 
                  :items="awsRegions" 
                  value-key="name" 
                  option-attribute="label" 
                  class="w-96" size="lg"
                />
              </UFormField>
            </UForm>
          </div>
          <ServiceConfiguration :scan-error="scanError" :service="service" />
        </div>

        <template #footer>
          <div class="flex justify-start">
            <UButton 
              size="lg" 
              @click="router.push('/new/deploy')"
            >
              Continue
            </UButton>
          </div>
        </template>
      </UCard>
    </ClientOnly>
    <div v-else class="flex justify-center items-center p-8">
      <p>Scanning your repository...</p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import ServiceConfiguration from '~/components/application/ServiceConfiguration.vue';
// import { applicationInputSchema } from '~/server/trpc/routers/applications.router';

definePageMeta({
  layout: 'new'
});

const route = useRoute();
const router = useRouter();
const { 
  setApplicationSchema,
  applicationSchema,
  branches,
  isLoading,
  providers,
  selectedProviderId,
  providerError,
  scanError,
} = useNewApplicationFlow();

const appConfig = useAppConfig();
const awsRegions = ref(appConfig.regions);

const providerItems = computed(() => providers.value.map(p => ({ value: p.id, label: p.alias })));
const branchItems = computed(() => branches.value.map(b => ({ value: b.name, label: b.name })));
const service = computed(() => applicationSchema.value.environments?.[0]?.services?.[0]);

onMounted(async () => {
  // If route contains repo info, let the composable initialize applicationSchema and fetch branches/build settings
  const ownerParam = route.query.owner as string | undefined;
  const repoParam = route.query.repo as string | undefined;
  const installationIdParam = route.query.installation_id ? Number(route.query.installation_id) : undefined;
  const typeParam = route.query.stack_type as string | undefined;

  if (ownerParam && repoParam && installationIdParam) {
    await setApplicationSchema(ownerParam, repoParam, installationIdParam, typeParam || null);
  }
});
</script>