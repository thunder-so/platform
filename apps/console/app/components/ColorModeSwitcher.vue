<template>
  <div class="flex items-center gap-1">
    <UButton
      v-for="t in themes"
      :key="t.value"
      :icon="t.icon"
      :variant="colorMode.preference === t.value ? 'subtle' : 'ghost'"
      color="neutral"
      size="sm"
      class="flex-1 justify-center"
      @click="colorMode.preference = t.value"
    >
      <span class="text-xs">{{ t.label }}</span>
    </UButton>
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const themes = [
  { value: 'light', label: 'Light', icon: 'tabler:sun' },
  { value: 'dark',  label: 'Dark',  icon: 'tabler:moon' },
  { value: 'system', label: 'System', icon: 'tabler:device-desktop' },
]
</script>
