<template>
  <ClientOnly>
    <UForm ref="form" v-if="configuration" :state="configuration" :schema="FunctionServiceMetadataSchema" :validate-on="['input']" class="space-y-4">
      <UFormField label="Root Directory" name="rootDir" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" name="build_system" class="grid grid-cols-3 gap-4">
        <USelect v-model="configuration.build_system" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="configuration.build_system === 'Custom Dockerfile'" label="Docker File" name="dockerFile" class="grid grid-cols-3 gap-4">
        <UInput v-model="configuration.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" name="memorySize" class="grid grid-cols-3 gap-4">
        <UInputNumber v-model="configuration.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Keep Warm" name="keepWarm" class="grid grid-cols-3 gap-4">
        <USwitch v-model="configuration.keepWarm" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { ref, computed } from 'vue';
import { z } from 'zod';
import { FunctionServiceMetadataSchema } from '~/server/validators/common';

type Configuration = z.infer<typeof FunctionServiceMetadataSchema>;

defineProps({
  configuration: {
    type: Object as PropType<Configuration>,
    required: true
  }
});

const form = ref();
const errors = computed(() => form.value?.errors || []);

defineExpose({ errors });

</script>