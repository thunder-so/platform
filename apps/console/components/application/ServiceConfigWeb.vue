<template>
  <ClientOnly>
    <UForm :state="service" class="space-y-4">
      <UFormField label="Root Directory" name="app_props.rootDir">
        <UInput v-model="service.app_props.rootDir" placeholder="./" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Docker File" name="metadata.dockerFile">
        <UInput v-model="service.metadata.dockerFile" placeholder="Dockerfile" class="w-96" size="lg" />
      </UFormField>
      <UFormField label="Desired Count" name="metadata.desiredCount">
        <UInputNumber v-model="service.metadata.desiredCount" :default-value="1" :min="1" :max="25" size="lg" />
      </UFormField>
      <UFormField label="CPU" name="metadata.cpu">
        <UInputNumber v-model="service.metadata.cpu" :default-value="0.25" :min="0.25" :max="192" :step="0.25" size="lg" />
      </UFormField>
      <UFormField label="Memory Size (MB)" name="metadata.memorySize">
        <UInputNumber v-model="service.metadata.memorySize" :default-value="1792" :min="128" :max="10240" size="lg" />
      </UFormField>
      <UFormField label="Port" name="metadata.port">
        <UInput v-model.number="service.metadata.port" type="number" placeholder="3000" size="lg" />
      </UFormField>
    </UForm>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { ServiceSchema } from '~/server/db/schema';

const props = defineProps<{ service: ServiceSchema }>();

const appConfig = useAppConfig();
</script>