<template>
  <ClientOnly>
  <UForm ref="form" v-if="configuration" :state="{ metadata: configuration }" :schema="serviceSchema" :validate-on="['input']" class="space-y-6">
      <UFormField label="Root Directory" description="The root directory of your project. For monorepos, enter the path to the project." name="rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.rootDir" placeholder="/" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Output Directory" description="The directory where compiled files are stored after running build scripts. E.g. `dist` or `build`." name="outputDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.outputDir" placeholder="public/" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Runtime" description="Select the version on Node.js you would like to use." name="buildProps.runtime_version" class="grid grid-cols-3 gap-4">
        <USelect
          v-model="configuration.buildProps.runtime_version"
          :items="runtimes"
          option-attribute="label"
          value-key="value"
          class="w-128" size="lg"
        />
      </UFormField>
      <UFormField label="Install Command" description="This is the script that installs the dependencies in your package.json file." name="buildProps.installcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.buildProps.installcmd" placeholder="npm install" class="w-128" size="lg" />
      </UFormField>
      <UFormField label="Build Command" description="This is typically the script that compiles resources needed by your app." name="buildProps.buildcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.buildProps.buildcmd" placeholder="npm run build" class="w-128" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { z } from 'zod';
import { ref, computed } from 'vue';
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

const serviceSchema = z.object({
  metadata: SPAServiceMetadataSchema,
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>