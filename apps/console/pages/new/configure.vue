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
          <UAlert v-if="loadError" color="error" variant="subtle" class="mb-4" :title="loadError" />

          <div v-if="applicationSchema.environments" class="space-y-4">
            <UForm ref="form" :state="applicationSchema" :schema="applicationInputSchema" :validate-on="['blur']" class="space-y-4">
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
                      <span class="text-sm text-muted">{{applicationSchema.environments?.[0]?.services?.[0]?.owner}}/{{applicationSchema.environments?.[0]?.services?.[0]?.repo}}</span>
                    </p>
                  </template>
                </UInput>
              </UFormField>

              <UFormField label="Branch" class="grid grid-cols-3 gap-4">
                <USelect 
                  v-model="selectedBranchName" 
                  :items="branchItems" 
                  class="w-96" size="lg"
                />
              </UFormField>

              <UFormField label="Application Name" name="display_name" class="grid grid-cols-3 gap-4">
                <UInput v-model="applicationSchema.display_name" size="lg" class="w-96" />
              </UFormField>

              <!-- <UFormField label="Environment Name" name="environments.0.display_name" class="grid grid-cols-3 gap-4">
                <UInput v-model="applicationSchema.environments[0].display_name" size="lg" class="w-96" />
              </UFormField> -->

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
          <ServiceConfiguration ref="serviceConfig" :scan-error="scanError" :service="service" @update:service="(updatedService) => {
            if (applicationSchema.environments && applicationSchema.environments[0] && applicationSchema.environments[0].services) {
              applicationSchema.environments[0].services = [updatedService];
            }
          }" />
        </div>

        <template #footer>
          <div class="flex justify-start">
            <UButton 
              size="lg" 
              :disabled="hasValidationErrors"
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
import ServiceConfiguration from '~/components/new/ServiceConfiguration.vue';
import { applicationInputSchema } from '~/server/validators/new';

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
  providers,
  selectedProviderId,
  loadError,
  scanError,
} = useNewApplicationFlow();

const appConfig = useAppConfig();
const awsRegions = ref(appConfig.regions);

const providerItems = computed(() => providers.value.map(p => ({ value: p.id, label: p.alias })));
const branchItems = computed(() => branches.value.map(b => ({ value: b.name, label: b.name })));
const service = computed(() => applicationSchema.value.environments?.[0]?.services?.[0]);

const form = ref();
const serviceConfig = ref();

const hasValidationErrors = computed(() => {
  const formErrors = form.value?.errors?.length > 0;
  const serviceErrors = serviceConfig.value?.hasErrors;
  return formErrors || serviceErrors;
});

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