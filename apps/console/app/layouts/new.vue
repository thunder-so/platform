<template>
  <div>
    <Header />
    <ClientOnly>
      <div v-if="loading" class="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div class="text-sm text-muted">Loading...</div>
        </div>
      </div>
      <div v-else-if="error" class="flex justify-center items-center p-8">
        <UAlert color="error" variant="soft" :title="`Error: ${error.message}`" />
      </div>
      <div v-else-if="providers.length === 0" class="flex justify-center items-center" style="height: 50vh;">
        <UCard class="w-full max-w-lg">
          <template #header>
            <h2>Connect AWS Account</h2>
          </template>
          
          <p class="mb-4 text-sm text-muted">Connect an AWS account to deploy your applications.</p>
          <UButton
            icon="tabler:brand-aws"
            size="lg"
            :to="`/org/${selectedOrganization?.id}/aws`"
            label="Connect AWS Account"
          />
        </UCard>
      </div>
      <div v-else-if="installations.length === 0" class="flex justify-center items-center" style="height: 50vh;">
        <UCard class="w-full max-w-lg">
          <template #header>
            <h2>Connect to GitHub</h2>
          </template>
          
          <p class="mb-4 text-sm text-muted">Install the Thunder.so GitHub App to see your repositories.</p>
          <UButton
            icon="i-uil-github"
            size="lg"
            @click="handleInstallApp"
            :loading="installing"
            label="Install GitHub App"
          />
        </UCard>
      </div>
      <div v-else>
        <UContainer>
          <div class="mt-8 mb-6 pb-6 border-b border-muted">
            <h1 class="text-2xl font-bold mb-6">{{ pageTitle }}</h1>
            <div class="flex items-center space-x-4">
              <div v-for="(step, index) in steps" :key="index" class="flex items-center">
                <div :class="['step', { 'active': currentStep >= index + 1, 'completed': currentStep > index + 1 }]">
                  <span v-if="currentStep <= index + 1">{{ index + 1 }}</span>
                  <UIcon v-else name="tabler:check" />
                </div>
                <span class="label leading-8" :class="{'font-bold': currentStep === index + 1}">{{ step.label }}</span>
                <div v-if="index < steps.length - 1" class="separator"></div>
              </div>
            </div>
          </div>

          <main class="mb-12">
            <slot />
          </main>
        </UContainer>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, provide } from 'vue';
import { useRoute } from 'vue-router';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';

const { currentStep, applicationSchema } = useNewApplicationFlow();
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const { selectedOrganization } = useMemberships();
const { openInstallationPopup } = useGithubPopup();
const toast = useToast();

const route = useRoute();
const installations = ref<any[]>([]);
const providers = ref<any[]>([]);
const loading = ref(true);
const error = ref<{ message: string } | null>(null);
const installing = ref(false);

provide('installations', installations);

const pageTitle = computed(() => {
  const stackType = route.query.stack_type;
  switch (stackType) {
    case 'SPA':
      return 'Create new Static Site';
    case 'FUNCTION':
      return 'Create new Lambda Function';
    case 'WEB_SERVICE':
      return 'Create new Web Service';
    default:
      return 'Create new Application';
  }
});

const steps = [
  {
    label: 'Import repository',
  },
  {
    label: 'Configure',
  },
  {
    label: 'Deploy',
  }
];

const fetchProviders = async () => {
  if (!selectedOrganization.value) return;
  
  try {
    const { data, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('organization_id', selectedOrganization.value.id)
      .is('deleted_at', null);

    if (fetchError) throw fetchError;
    providers.value = data || [];
  } catch (e: any) {
    console.error('Error fetching providers:', e);
  }
};

const fetchInstallations = async () => {
  if (!user.value) {
    loading.value = false;
    return;
  }
  try {
    const { data, error: fetchError } = await supabase
      .from('installations')
      .select('*')
      .eq('user_id', user.value.sub)
      .is('deleted_at', null);

    if (fetchError) throw fetchError;
    installations.value = data || [];
  } catch (e: any) {
    console.error('Error fetching installations:', e);
    error.value = { message: (e as Error).message || 'Error fetching Github installations.' };
  } finally {
    loading.value = false;
  }
};

async function handleInstallApp() {
  installing.value = true;
  try {
    await openInstallationPopup();
    await fetchInstallations();
    toast.add({
      title: 'GitHub App installed successfully',
      color: 'success'
    });
  } catch (error: any) {
    if (error.message !== 'Installation cancelled') {
      toast.add({
        title: 'Installation failed',
        description: error.message,
        color: 'error'
      });
    }
  } finally {
    installing.value = false;
  }
}

onMounted(async () => {
  await fetchProviders();
  fetchInstallations();
});
</script>

<style scoped>
@reference "~/assets/css/main.css";

.step {
  @apply w-8 h-8 text-xs rounded-full flex items-center justify-center text-white mr-3 bg-muted;
}

.step.active {
  @apply bg-inverted text-inverted;
}

.step.completed {
  @apply ring ring-inset ring-success/25 bg-success/10 text-success;
}

.separator {
  @apply w-12 h-px bg-muted mx-4;
}
</style>