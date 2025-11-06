<template>
  <UModal
    title="Deploy latest commit"
    description="Review the latest commit and confirm deployment."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div v-if="pending" class="space-y-3">
        <USkeleton class="h-6 w-3/4" />
        <USkeleton class="h-4 w-1/2" />
      </div>

      <div v-else-if="error">
        <p class="text-red-500">Error loading latest commit: {{ error.message }}</p>
      </div>

      <div v-else-if="latest">
        <div class="text-left">
          <h3 class="text-sm font-medium mb-2">{{ latest.commit.message.split('\n')[0] }}</h3>
          <p class="text-xs text-muted mb-2">{{ latest.sha.substring(0,7) }} • {{ author }} • {{ date }}</p>
        </div>
      </div>

      <div v-else>
        <p class="text-sm text-muted">No commits found for this repository/branch.</p>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="handleClose(close)" />
      <UButton :disabled="!latest" :loading="isDeploying" @click="handleConfirm(close)">Deploy</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ServiceSchema, EnvironmentSchema } from '~~/server/validators/app';
import { useTimeAgo } from '@vueuse/core';

const props = defineProps<{
  service: ServiceSchema,
  environment: EnvironmentSchema,
  close?: (result?: string) => void
}>()

const { $client } = useNuxtApp()
const toast = useToast()

const isDeploying = ref(false)

const { data: commits, pending, error } = useAsyncData(
  `commits:latest:${props.service?.id}`,
  () => {
    if (!props.service) return Promise.resolve([])
    return $client.services.getCommits.query({
      owner: props.service.owner as string,
      repo: props.service.repo as string,
      branch: props.service.branch as string,
      installation_id: props.service.installation_id as number
    })
  }, { immediate: true }
)

const latest = computed(() => (commits.value && commits.value.length > 0) ? commits.value[0] : null)

const author = computed(() => latest.value?.commit?.author?.name || 'Unknown')
const date = computed(() => latest.value?.commit?.author?.date ? useTimeAgo(new Date(latest.value.commit.author.date)).value : 'Unknown date')

function handleClose(close: () => void) {
  props.close?.()
  close()
}

async function handleConfirm(close: () => void) {
  if (!latest.value || !props.environment || !props.environment.provider) return
  isDeploying.value = true
  try {
    await $client.services.triggerPipeline.mutate({
      providerId: props.environment.provider.id as string,
      serviceId: props.service.id,
      sha: latest.value.sha,
    })

    toast.add({ title: 'Success', description: `Deployment started for commit ${latest.value.sha.substring(0,7)}` });
    props.close?.(latest.value.sha)
    close()
  } catch (error: any) {
    console.error('Failed to trigger pipeline from DeployLatestModal:', error)
    toast.add({ title: 'Error', description: error.message || 'Failed to start deployment.', color: 'error' });
  } finally {
    isDeploying.value = false
  }
}
</script>
