<template>
  <ClientOnly>
    <UForm ref="form" v-if="configuration" :state="configuration" :schema="SPAServiceMetadataSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Output Directory" name="outputDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.outputDir" placeholder="public/" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Runtime" name="buildProps.runtime" class="grid grid-cols-3 gap-4">
        <USelect 
          v-model="configuration.buildProps.runtime_version" 
          :items="runtimes" 
          option-attribute="label" 
          value-key="value" 
          class="w-128" size="lg"
        />
      </UFormField>
      <UFormField label="Install Command" name="buildProps.installcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.buildProps.installcmd" placeholder="npm install" class="w-128" size="lg" />
      </UFormField>
      <UFormField label="Build Command" name="buildProps.buildcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.buildProps.buildcmd" placeholder="npm run build" class="w-128" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { ref, computed } from 'vue';
import { z } from 'zod';
import { SPAServiceMetadataSchema } from '~/server/validators/common';

type Configuration = z.infer<typeof SPAServiceMetadataSchema>;

const props = defineProps({
  configuration: {
    type: Object as PropType<Configuration>,
    required: true
  }
});

const appConfig = useAppConfig();
const runtimes = ref(appConfig.runtimes);

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>