<template>
  <div>
    <UCard>
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <Icon name="mdi:github" class="w-6 h-6 text-gray-700" />
        </div>
        <div>
          <h3 class="text-md text-highlighted">{{ applicationSchema.name }}</h3>
          <p class="text-sm text-gray-600">
            <a 
              :href="`https://github.com/${applicationSchema.environments?.[0]?.services?.[0]?.pipeline_props?.sourceProps?.owner}/${applicationSchema.environments?.[0]?.services?.[0]?.pipeline_props?.sourceProps?.repo}`"
              target="_blank"
              class="text-sm text-gray-600 hover:underline"
            >
              {{ applicationSchema.environments?.[0]?.services?.[0]?.pipeline_props?.sourceProps?.owner }}/{{ applicationSchema.environments?.[0]?.services?.[0]?.pipeline_props?.sourceProps?.repo }}
            </a>
          </p>
        </div>
      </div>
    </UCard>
    <UCard class="mt-6">
      <template #header>
        <h1>Configure application</h1>
      </template>

      <div v-if="!applicationSchema.environments" class="flex justify-center items-center p-8">
        <p>Scanning the repository ...</p>
      </div>

      <div v-else class="space-y-4">
        <UForm :state="applicationSchema">
          <UFormField label="Application Name">
            <UInput v-model="applicationSchema.display_name" size="lg" class="w-96" />
          </UFormField>
        </UForm>

        <ClientOnly>
        <UForm :state="applicationSchema" class="space-y-4">
          <UFormField label="Environment Name" description="Your default environment">
            <UInput v-model="applicationSchema.environments[0].display_name" size="lg" class="w-96" />
          </UFormField>

          <div class="flex space-x-4">
            <UFormField label="AWS Account">
              <USelect 
                v-model="applicationSchema.environments[0].provider_id" 
                :items="providerItems" 
                class="w-96" size="lg"
              />
            </UFormField>

            <UFormField label="Region">
              <USelect 
                v-model="applicationSchema.environments[0].region" 
                :items="awsRegions" 
                value-key="name" 
                option-attribute="label" 
                class="w-96" size="lg"
              />
            </UFormField>
          </div>
        </UForm>
        </ClientOnly>
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
</template>


<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import ServiceConfiguration from '~/components/application/ServiceConfiguration.vue';
import type { Provider } from '~/server/db/schema';

definePageMeta({
  layout: 'new'
});

const route = useRoute();
const router = useRouter();
const { 
  setProvider,
  setApplicationSchema,
  applicationSchema
} = useNewApplicationFlow();

const appConfig = useAppConfig();
const { $client } = useNuxtApp();
const { selectedOrganization } = useMemberships();
const supabase = useSupabaseClient();
const providers = ref<Provider[]>([]);
const awsRegions = ref(appConfig.regions);

const providerItems = computed(() => providers.value.map(p => ({ value: p.id, label: p.alias })));

onMounted(async () => {
  const ownerParam = route.query.owner as string;
  const repoParam = route.query.repo as string;
  const installationIdParam = Number(route.query.installation_id);
  const typeParam = route.query.stack_type as string;
  
  if (ownerParam && repoParam && installationIdParam) {
    setApplicationSchema(ownerParam, repoParam, installationIdParam, typeParam);
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
    if (providers.value.length > 0) {
      setProvider(providers.value[0]!);
    }
  }
});
</script>