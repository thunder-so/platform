<template>
  <ClientOnly>
    <UForm v-if="service" :state="service" class="space-y-4">
      <UFormField label="Root Directory" name="appProps.rootDir">
        <UInput v-model="service.app_props.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Build System" name="metadata.buildSystem">
        <USelect v-model="service.metadata.buildSystem" :items="['Nixpacks', 'Buildpacks', 'Custom Dockerfile']" class="w-96" size="lg" />
      </UFormField>
      <UFormField v-if="service.metadata.buildSystem === 'Custom Dockerfile'" label="Docker File" name="metadata.dockerFile">
        <UInput v-model="service.metadata.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" name="metadata.memorySize">
        <UInputNumber v-model="service.metadata.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Keep Warm" name="metadata.keepWarm">
        <USwitch v-model="service.metadata.keepWarm" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';

const { applicationSchema } = useNewApplicationFlow();
const service = computed(() => applicationSchema.value.environments?.[0]?.services?.[0]);
</script>