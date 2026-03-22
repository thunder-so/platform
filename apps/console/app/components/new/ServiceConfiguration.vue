<template>
  <div>  
    <div v-if="internalServiceLoading" class="flex items-center justify-center py-8">
      <div class="flex flex-col items-center gap-4">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <div class="text-sm text-muted">Scanning your project...</div>
      </div>
    </div>

    <ClientOnly v-else-if="service">
      <div class="mt-4">
        <ServiceConfigStatic v-if="service.stack_type === 'STATIC'" ref="serviceForm" :configuration="service.metadata" />
        <ServiceConfigLambda v-else-if="service.stack_type === 'LAMBDA'" ref="serviceForm" :configuration="service.metadata" :has-dockerfile="scanData?.hasDockerfile" />
        <ServiceConfigFargate v-else-if="service.stack_type === 'FARGATE'" ref="serviceForm" :configuration="service.metadata" :has-dockerfile="scanData?.hasDockerfile" />
      </div>
      <EnvironmentVariables v-model="environmentVariablesModel" ref="envVarsForm" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PropType } from 'vue';
import type { ServiceInputSchema, ApplicationInputSchema } from '~~/server/validators/new';
import ServiceConfigStatic from './ServiceConfigStatic.vue';
import ServiceConfigLambda from './ServiceConfigLambda.vue';
import ServiceConfigFargate from './ServiceConfigFargate.vue';
import EnvironmentVariables from './EnvironmentVariables.vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';

const props = defineProps({
  repoInfo: {
    type: Object as PropType<{ owner: string; repo: string; installation_id: number } | null>,
    default: null,
  },
  selectedStackType: {
    type: String as PropType<'STATIC' | 'LAMBDA' | 'FARGATE'>,
    required: true,
  },
  selectedRootDir: {
    type: String,
    required: true,
  },
  applicationSchema: {
    type: Object as PropType<Partial<ApplicationInputSchema>>,
    required: true,
  }
});

const emit = defineEmits(['update:service']);

const { $client } = useNuxtApp();
const { createServiceSchema, scanError } = useNewApplicationFlow();

const internalServiceLoading = ref(false);
const scanData = ref<any>(null);
const serviceForm = ref();
const envVarsForm = ref();

const service = computed(() => props.applicationSchema.environments?.[0]?.services?.[0] as ServiceInputSchema | undefined);

const fetchAndSetService = async () => {
  if (!props.repoInfo) return;
  
  internalServiceLoading.value = true;
  scanError.value = null;

  try {
    const result = await $client.github.scanProject.query({
      owner: props.repoInfo.owner,
      repo: props.repoInfo.repo,
      installation_id: props.repoInfo.installation_id,
      rootDir: props.selectedRootDir,
    });
    scanData.value = result;

    const serviceSchema = await createServiceSchema(
      props.selectedStackType,
      props.repoInfo.owner,
      props.repoInfo.repo,
      props.repoInfo.installation_id,
      scanData.value,
      props.selectedRootDir
    );

    emit('update:service', serviceSchema);
  } catch (e: any) {
    console.error("Failed to scan project:", e);
    scanError.value = e.message || 'An unexpected error occurred during project scan.';
  } finally {
    internalServiceLoading.value = false;
  }
};

// Single watcher for all inputs that should trigger a re-scan
watch(
  [() => props.repoInfo, () => props.selectedStackType, () => props.selectedRootDir],
  async ([newRepo, newStack, newRootDir], [oldRepo, oldStack, oldRootDir]) => {
    if (!newRepo) return;
    
    // Check if anything actually changed to avoid redundant calls
    const repoChanged = JSON.stringify(newRepo) !== JSON.stringify(oldRepo);
    const stackChanged = newStack !== oldStack;
    const rootDirChanged = newRootDir !== oldRootDir;

    if (repoChanged || stackChanged || rootDirChanged) {
      await fetchAndSetService();
    }
  },
  { immediate: true }
);

const environmentVariablesModel = computed({
  get() {
    if (!service.value || !service.value.service_variables) return [];
    return service.value.service_variables.map(v => ({ key: v.key, value: v.value }));
  },
  set(newValue: { key: string; value: string }[]) {
    if (!service.value) return;
    
    const updatedService = { ...service.value };
    const variableType = updatedService.stack_type === 'STATIC' ? 'build' : 'runtime';

    updatedService.service_variables = newValue.map(v => ({
      key: v.key,
      value: v.value,
      type: variableType,
    }));

    emit('update:service', updatedService);
  }
});

const hasErrors = computed(() => {
  return serviceForm.value?.errors?.length > 0;
});

defineExpose({ hasErrors });
</script>
