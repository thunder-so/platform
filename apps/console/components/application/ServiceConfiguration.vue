<template>
  <div>
    <h2>Service Configuration</h2>
    <div>
      <label>
        <input type="radio" value="static" v-model="selectedServiceType" /> Static
      </label>
      <label>
        <input type="radio" value="function" v-model="selectedServiceType" /> Function
      </label>
      <label>
        <input type="radio" value="web" v-model="selectedServiceType" /> Web
      </label>
    </div>

    <div v-if="selectedServiceType === 'static'">
      <ServiceConfigStatic @update:config="updateServiceConfig" />
    </div>
    <div v-else-if="selectedServiceType === 'function'">
      <ServiceConfigFunction @update:config="updateServiceConfig" />
    </div>
    <div v-else-if="selectedServiceType === 'web'">
      <ServiceConfigWeb @update:config="updateServiceConfig" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useNewApplicationFlow } from '~/composables/useNewApplicationFlow';
import ServiceConfigStatic from './ServiceConfigStatic.vue';
import ServiceConfigFunction from './ServiceConfigFunction.vue';
import ServiceConfigWeb from './ServiceConfigWeb.vue';

const { serviceType, setServiceType, serviceConfig, setServiceConfig } = useNewApplicationFlow();

const selectedServiceType = ref(serviceType.value);

watch(selectedServiceType, (newType) => {
  setServiceType(newType);
  // Reset serviceConfig when service type changes
  setServiceConfig({});
});

const updateServiceConfig = (config: any) => {
  setServiceConfig(config);
};
</script>

<style scoped></style>