<template>
  <ClientOnly>
    <UForm ref="form" v-if="configuration" :state="configuration" :schema="StaticServiceMetadataSchema" :validate-on="['input']" class="space-y-6">
      <UFormField label="Output Directory" description="The directory where compiled files are stored after running build scripts. E.g. `dist` or `build`." name="outputDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.outputDir" placeholder="public/" class="w-96" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { ref, computed } from 'vue';
import { z } from 'zod';
import { StaticServiceMetadataSchema } from '~~/server/validators/common';

type Configuration = z.infer<typeof StaticServiceMetadataSchema>;

const props = defineProps({
  configuration: {
    type: Object as PropType<Configuration>,
    required: true
  }
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });
</script>