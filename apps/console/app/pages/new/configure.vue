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

        <div class="space-y-6 mt-6">
          <UAlert v-if="loadError" color="error" variant="subtle" class="mb-4" :title="loadError" />

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

              <UFormField label="Root Directory" description="The root directory of your project. For monorepos, enter the path to the project." class="grid grid-cols-3 gap-4">
                <div class="space-y-2">
                  <RootDirInput v-model="selectedRootDir" />
                </div>
              </UFormField>

              <UAlert v-if="scanError" color="warning" variant="subtle" :title="scanError" />

              <!-- <UFormField label="AWS Account" description="Select the AWS Account where you want to deploy." class="grid grid-cols-3 gap-4">
                <USelect 
                  v-model="selectedProviderIdComputed" 
                  :items="providerItems" 
                  class="w-96" size="lg"
                />
              </UFormField>

              <UFormField label="Region" description="The AWS region where you want to deploy." class="grid grid-cols-3 gap-4">
                <USelect 
                  v-model="regionComputed" 
                  :items="awsRegions" 
                  value-key="name" 
                  option-attribute="label" 
                  class="w-96" size="lg"
                  :disabled="!applicationSchema.environments?.[0]"
                />
              </UFormField> -->
            </UForm>
          </div>

          <ServiceConfiguration 
            ref="serviceConfig" 
            :repo-info="repoInfo"
            :selected-stack-type="selectedStackType"
            :selected-root-dir="selectedRootDir"
            :application-schema="applicationSchema"
            @update:service="(updatedService) => {
              if (applicationSchema.environments && applicationSchema.environments[0]) {
                applicationSchema.environments[0].services = [updatedService];
              }
            }"
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
  selectedRootDir,
  repoInfo
} = useNewApplicationFlow();

const appConfig = useAppConfig();
const awsRegions = ref(appConfig.regions);

const providerItems = computed(() => providers.value.map(p => ({ value: p.id, label: p.alias || undefined })));
const branchItems = computed(() => branches.value.map(b => ({ value: b.name, label: b.name })));
const selectedProviderIdComputed = computed({
  get: () => selectedProviderId.value || undefined,
  set: (value) => selectedProviderId.value = value || null
});
const regionComputed = computed({
  get: () => applicationSchema.value.environments?.[0]?.region,
  set: (value) => {
    if (applicationSchema.value.environments?.[0] && value) {
      applicationSchema.value.environments[0].region = value!;
    }
  }
});
const isNavigating = ref(false);
const service = computed(() => applicationSchema.value.environments?.[0]?.services?.[0]);
const form = ref();
const serviceConfig = ref();

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
    label: 'Static Site', 
    value: 'STATIC', 
    icon: 'tabler:file',
    description: 'S3 and CloudFront hosting for SPA/SSG' 
  },
  { 
    label: 'Lambda Function', 
    value: 'LAMBDA', 
    icon: 'tabler:lambda',
    description: 'Lambda and API Gateway' 
  },
  { 
    label: 'Fargate Service', 
    value: 'FARGATE',
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