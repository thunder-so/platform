<template>
  <ClientOnly>
  <UForm ref="form" v-if="service" :state="service" :validate-on="['input']" class="space-y-6">
      <UFormField label="Output Directory" description="The directory where compiled files are stored after running build scripts. E.g. `dist` or `build`." name="metadata.outputDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.outputDir" placeholder="public/" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build Runtime" description="Select the version on Node.js you would like to use." name="pipeline_metadata.buildProps.runtime_version" class="grid grid-cols-3 gap-4">
        <USelect
          v-model="service.pipeline_metadata.buildProps.runtime_version"
          :items="runtimes"
          option-attribute="label"
          value-key="value"
          class="w-128" size="lg"
        />
      </UFormField>
      <UFormField label="Install Command" description="This is the script that installs the dependencies in your package.json file." name="pipeline_metadata.buildProps.installcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_metadata.buildProps.installcmd" placeholder="npm install" class="w-128" size="lg" />
      </UFormField>
      <UFormField label="Build Command" description="This is typically the script that compiles resources needed by your app." name="pipeline_metadata.buildProps.buildcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.pipeline_metadata.buildProps.buildcmd" placeholder="npm run build" class="w-128" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { ref, computed } from 'vue';
import type { ServiceInputSchema } from '~~/server/validators/new';

const props = defineProps({
  service: {
    type: Object as PropType<ServiceInputSchema>,
    required: true
  }
});

const appConfig = useAppConfig();
const runtimes = ref(appConfig.runtimes);

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>