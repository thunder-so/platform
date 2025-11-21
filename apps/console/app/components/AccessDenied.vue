<template>
  <div class="flex items-center justify-center min-h-[400px]">
    <UCard class="max-w-md">
      <template #header>
        <div class="flex items-center gap-2">
          <Icon name="tabler:shield-x" class="text-error" size="20" />
          <h3>Access Denied</h3>
        </div>
      </template>
      
      <div class="space-y-4">
        <p class="text-muted">{{ message }}</p>
        <slot />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string
}

defineProps<Props>()
</script>