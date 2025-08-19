<template>
  <ClientOnly>
    <UForm ref="form" v-if="service" :state="service" :schema="serviceSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="app_props.rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.app_props.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Output Directory" name="metadata.outputDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.outputDir" placeholder="public/" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Runtime" name="pipeline_props.buildProps.runtime_version" class="grid grid-cols-3 gap-4">
        <USelect 
          v-model="service.pipeline_props.buildProps.runtime_version" 
          :items="runtimes" 
          option-attribute="label" 
          value-key="value" 
          class="w-128" size="lg"
        />
      </UFormField>
      <UFormField label="Install Command" name="pipeline_props.buildProps.installcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_props.buildProps.installcmd" placeholder="npm install" class="w-128" size="lg" />
      </UFormField>
      <UFormField label="Build Command" name="pipeline_props.buildProps.buildcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_props.buildProps.buildcmd" placeholder="npm run build" class="w-128" size="lg" />
      </UFormField>
      <div>
        <h2 class="text-md font-semibold mt-6 mb-4 pb-4 border-b border-muted">Environment Variables</h2>
        <div v-for="(variable, index) in service.pipeline_props.buildProps.environment" :key="index" class="grid grid-cols-9 gap-x-2 mt-2 items-start">
          <UFormField :name="`pipeline_props.buildProps.environment.${index}.key`" class="col-span-4">
            <UInput 
              :model-value="getKey(variable)" 
              @update:model-value="updateKey(index, $event)"
              placeholder="Key" 
              class="w-full"
              :error="getKeyError(index)"
            />
          </UFormField>
          <UFormField :name="`pipeline_props.buildProps.environment.${index}.value`" class="col-span-4">
            <UInput 
              :model-value="getValue(variable)" 
              @update:model-value="updateValue(index, $event)"
              placeholder="Value" 
              class="w-full" 
            />
          </UFormField>
          <div class="col-span-1">
            <UButton icon="heroicons:trash" color="error" variant="ghost" @click="removeVariable(index)" />
          </div>
        </div>
        <UButton color="primary" variant="outline" icon="i-heroicons-plus-circle-20-solid" class="mt-2" @click="addVariable">Add Variable</UButton>
      </div>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { z } from 'zod';
import { ref, computed } from 'vue';
import { type ApplicationInputSchema, appPropsSchema, spaMetadataSchema, spaPipelinePropsSchema } from '~/server/db/types';

type ServiceInput = ApplicationInputSchema['environments'][0]['services'][0];

const props = defineProps({
  service: {
    type: Object as PropType<ServiceInput>,
    required: true
  }
});

const appConfig = useAppConfig();
const runtimes = ref(appConfig.runtimes);

const getKey = (variable: Record<string, string>) => {
  return Object.keys(variable)[0] || '';
};

const getValue = (variable: Record<string, string>) => {
  return Object.values(variable)[0] || '';
};

const updateKey = (index: number, newKey: string) => {
  const oldValue = getValue(props.service.pipeline_props.buildProps.environment[index]);
  props.service.pipeline_props.buildProps.environment[index] = { [newKey]: oldValue };
};

const updateValue = (index: number, newValue: string) => {
  const oldKey = getKey(props.service.pipeline_props.buildProps.environment[index]);
  props.service.pipeline_props.buildProps.environment[index] = { [oldKey]: newValue };
};

const addVariable = () => {
  props.service.pipeline_props.buildProps.environment.push({ '': '' });
};

const removeVariable = (index: number) => {
  props.service.pipeline_props.buildProps.environment.splice(index, 1);
};

const getKeyError = (index: number) => {
  return computed(() => {
    const variable = props.service.pipeline_props.buildProps.environment[index];
    if (!variable) return null;
    
    const key = getKey(variable);
    
    if (!key.trim()) {
      return 'Key is required.';
    }
    
    if (key.trim() && !/^[a-zA-Z0-9_]+$/.test(key.trim())) {
      return 'Use only letters, numbers, and underscores.';
    }
    
    return null;
  }).value;
};

const serviceSchema = z.object({
  app_props: appPropsSchema,
  metadata: spaMetadataSchema,
  pipeline_props: spaPipelinePropsSchema
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>
