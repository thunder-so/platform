<template>
    <ClientOnly v-if="!isLoading">
      <!-- <UCard>
        <pre>{{ applicationSchema }}</pre>
      </UCard> -->
      <UCard class="mt-6">
        <template #header>
          <h1>Configure</h1>
        </template>

        <UFormField label="Application Type" description="The type of application you want to deploy." class="grid grid-cols-3 gap-4 mb-6">
          <USelect 
            v-model="selectedStackType" 
            :items="stackTypeOptions" 
            :icon="stackTypeOptions.find(option => option.value === selectedStackType)?.icon"
            orientation="horizontal" 
            size="lg"
            color="success"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Application Name" description="A unique name for your application." name="display_name" class="grid grid-cols-3 gap-4">
          <UInput v-model="applicationSchema.display_name" size="lg" class="w-96" required autofocus />
        </UFormField>

        <div class="space-y-6">
          <UAlert v-if="loadError" color="error" variant="subtle" class="mb-4" :title="loadError" />

          <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Application Configuration</h2>

          <div v-if="applicationSchema.environments" class="space-y-6">
            <UForm ref="form" :state="applicationSchema" :schema="applicationInputSchema" :validate-on="['blur']" class="space-y-4">
              <UFormField label="Repository" description="Github account and repository." class="grid grid-cols-3 gap-4">
                <UInput 
                  disabled 
                  size="lg" 
                  variant="outline"
                  class="w-full"
                > 
                  <template #leading>
                    <p class="flex items-center">
                      <Icon name="tabler:brand-github" class="w-5 h-5 text-muted mr-2" />
                      <span v-if="repoInfo" class="text-sm text-muted">{{ repoInfo.owner }}/{{ repoInfo.repo }}</span>
                    </p>
                  </template>
                </UInput>
              </UFormField>

              <UFormField label="Branch" description="Repository branch used for this deployment." class="grid grid-cols-3 gap-4">
                <USelect 
                  v-model="selectedBranchName" 
                  :items="branchItems" 
                  class="w-96" size="lg"
                />
              </UFormField>

              <UFormField label="AWS Account" description="Select the AWS Account where you want to deploy." class="grid grid-cols-3 gap-4">
                <USelect 
                  v-model="selectedProviderId" 
                  :items="providerItems" 
                  class="w-96" size="lg"
                />
              </UFormField>

              <UFormField label="Region" description="The AWS region where you want to deploy." class="grid grid-cols-3 gap-4">
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
          <ServiceConfiguration 
            ref="serviceConfig" 
            :key="selectedStackType" 
            :scan-error="scanError" 
            :service="service" 
            :selected-stack-type="selectedStackType"
            :service-loading="serviceLoading"
            @update:service="(updatedService) => {
              if (applicationSchema.environments && applicationSchema.environments[0] && applicationSchema.environments[0].services) {
                applicationSchema.environments[0].services = [updatedService];
              }
            }"
            @update:stack-type="selectedStackType = $event" 
          />
        </div>

        <template #footer>
          <div class="flex justify-start">
            <UButton 
              size="lg" 
              :disabled="hasValidationErrors"
              :loading="isNavigating"
              @click="handleContinue"
            >
              Continue
            </UButton>
          </div>
        </template>
      </UCard>
    </ClientOnly>
    <div v-else class="flex items-center justify-center min-h-[calc(50vh-4rem)]">
      <div class="flex flex-col items-center gap-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div class="text-sm text-muted">Scanning your repository...</div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import ServiceConfiguration from '~/components/new/ServiceConfiguration.vue';
import { applicationInputSchema } from '~~/server/validators/new';

definePageMeta({
  layout: 'new'
});

const route = useRoute();
const router = useRouter();
const {
  setApplicationSchema,
  applicationSchema,
  branches,
  selectedBranchName,
  isLoading,
  serviceLoading,
  providers,
  selectedProviderId,
  loadError,
  scanError,
  selectedStackType,
  repoInfo
} = useNewApplicationFlow();

const appConfig = useAppConfig();
const awsRegions = ref(appConfig.regions);

const providerItems = computed(() => providers.value.map(p => ({ value: p.id, label: p.alias })));
const branchItems = computed(() => branches.value.map(b => ({ value: b.name, label: b.name })));
const service = computed(() => applicationSchema.value.environments?.[0]?.services?.[0]);
const form = ref();
const serviceConfig = ref();
const isNavigating = ref(false);

const hasValidationErrors = computed(() => {
  const formErrors = form.value?.errors?.length > 0;
  const serviceErrors = serviceConfig.value?.hasErrors;
  return formErrors || serviceErrors;
});

const handleContinue = async () => {
  isNavigating.value = true;
  await router.push('/new/deploy');
};

const stackTypeOptions = ref([
  { 
    label: 'Single Page App', 
    value: 'SPA', 
    icon: 'tabler:file',
    description: 'S3 and CloudFront hosting for SPA/SSG' 
  },
  { 
    label: 'Function', 
    value: 'FUNCTION', 
    icon: 'tabler:lambda',
    description: 'Lambda and API Gateway' 
  },
  { 
    label: 'Web Service', 
    value: 'WEB_SERVICE',
    icon: 'tabler:server',
    description: 'Fargate and API Gateway' 
  },
]);

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