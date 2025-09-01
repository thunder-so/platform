<template>
  <ClientOnly>
    <UForm ref="form" v-if="service" :state="service" :schema="serviceSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="metadata.rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.rootDir" placeholder="/" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Output Directory" name="metadata.outputDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.outputDir" placeholder="public/" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Runtime" name="metadata.buildProps.runtime_version" class="grid grid-cols-3 gap-4">
        <USelect
          v-model="service.metadata.buildProps.runtime_version"
          :items="runtimes"
          option-attribute="label"
          value-key="value"
          class="w-128" size="lg"
        />
      </UFormField>
      <UFormField label="Install Command" name="metadata.buildProps.installcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.buildProps.installcmd" placeholder="npm install" class="w-128" size="lg" />
      </UFormField>
      <UFormField label="Build Command" name="metadata.buildProps.buildcmd" class="grid grid-cols-3 gap-4">
        <UInput v-model="service.metadata.buildProps.buildcmd" placeholder="npm run build" class="w-128" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { z } from 'zod';
import { ref, computed } from 'vue';
import { SPAServiceMetadataSchema } from '~/server/validators/common';
import type { Service } from '~/server/db/schema';

const props = defineProps({
  service: {
    type: Object as PropType<Service>,
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