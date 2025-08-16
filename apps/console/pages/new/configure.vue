<template>
  <ClientOnly>
    <div>
      <UCard class="mt-6">
        <template #header>
          <h1>Configure application</h1>
        </template>

        <div v-if="applicationSchema.environments" class="space-y-4">
          <UForm :state="applicationSchema" class="space-y-4">
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
          <ServiceConfiguration />
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
    </div>
    <template #placeholder>
      <div class="flex justify-center items-center p-8">
        <p>Scanning the repository ...</p>
      </div>
    </template>
  </ClientOnly>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import ServiceConfiguration from '~/components/application/ServiceConfiguration.vue';
import type { Provider } from '~/server/db/schema';
import type { Branch } from '~/server/lib/github.library';

definePageMeta({
  layout: 'new'
});

const route = useRoute();
const router = useRouter();
const { $client } = useNuxtApp();
const { 
  setProvider,
  setApplicationSchema,
  applicationSchema,
  setBuildProps
} = useNewApplicationFlow();

const appConfig = useAppConfig();
const { selectedOrganization } = useMemberships();
const supabase = useSupabaseClient();
const providers = ref<Provider[]>([]);
const selectedProviderId = ref<string | null>(null);
const awsRegions = ref(appConfig.regions);
const repoBranches = ref<Branch[]>([]);

const providerItems = computed(() => providers.value.map(p => ({ value: p.id, label: p.alias })));
const branchItems = computed(() => repoBranches.value.map(b => ({ value: b.name, label: b.name })));

watch(selectedProviderId, (newId) => {
  if (newId) {
    const provider = providers.value.find(p => p.id === newId);
    if (provider) {
      setProvider(provider);
    }
  }
});

onMounted(async () => {
  const ownerParam = route.query.owner as string;
  const repoParam = route.query.repo as string;
  const installationIdParam = Number(route.query.installation_id);
  const typeParam = route.query.stack_type as string;
  
  if (ownerParam && repoParam && installationIdParam) {
    setApplicationSchema(ownerParam, repoParam, installationIdParam, typeParam);

    try {
      const branches = await $client.github.getBranches.query({
        owner: ownerParam,
        repo: repoParam,
        installation_id: installationIdParam,
      });
      
      repoBranches.value = branches || [];
      const defaultBranch = branches.find(b => b.is_default);
      if (defaultBranch && applicationSchema.value.environments?.[0]?.services?.[0]?.pipeline_props) {
        applicationSchema.value.environments[0].services[0].pipeline_props.sourceProps.branchOrRef = defaultBranch.name;
      }

      if (typeParam === 'SPA') {
        const buildSettings = await $client.github.scanRepository.query({
          owner: ownerParam,
          repo: repoParam,
          installation_id: installationIdParam,
        });
        if (buildSettings) {
          setBuildProps(buildSettings);
        }
      }
    } catch (error) {
      console.error('Failed to fetch branches or scan repository:', error);
    }
  }

  if (selectedOrganization.value?.id) {
    const { data: supabaseProviders, error: supabaseError } = await supabase
      .from('providers')
      .select('*')
      .eq('organization_id', selectedOrganization.value.id)
      .is('deleted_at', null);

    if (supabaseError) {
      throw supabaseError;
    }
    providers.value = supabaseProviders || [];
    if (providers.value.length > 0 && providers.value[0]) {
      selectedProviderId.value = providers.value[0].id;
    }
  }
});
</script>