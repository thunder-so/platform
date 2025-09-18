<template>
  <UModal 
    title="Deploy a specific commit"
    description="Select a commit to deploy."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div v-if="pending" class="flex items-center space-x-4">
        <USkeleton class="h-8 w-full" />
      </div>
      <div v-else-if="error">
        <p class="text-red-500">Error loading commits: {{ error.message }}</p>
      </div>
      <div v-else>
        <USelectMenu
          v-model="selectedCommit"
          :items="commitOptions"
          placeholder="Select a commit"
          class="w-full"
        >
          <template #item="{ item }">
            <div class="flex flex-col text-left">
              <span class="text-sm">{{ item.label }}</span>
              <span class="text-xs text-muted">{{ item.value.substring(0, 7) }} by {{ item.author }} on {{ item.date }}</span>
            </div>
          </template>
        </USelectMenu>
      </div>
    </template>
    
    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="outline" @click="handleClose(close)" />
      <UButton :disabled="!selectedCommit" :loading="isDeploying" @click="handleDeploy(close)">Deploy Commit</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ServiceSchema, EnvironmentSchema } from '~/server/validators/app'

const props = defineProps<{
  service: ServiceSchema,
  environment: EnvironmentSchema,
  close?: (result?: string) => void
}>()

const { $client } = useNuxtApp()

const selectedCommit = ref()
const isDeploying = ref(false)

const { data: commits, pending, error } = useAsyncData(
  `commits:${props.service?.id}`,
  () => {
    if (!props.service) return Promise.resolve([])
    return $client.services.getCommits.query({
      owner: props.service.owner as string,
      repo: props.service.repo as string,
      branch: props.service.branch as string,
      installation_id: props.service.installation_id as number
    })
  }, {
    immediate: true
  }
)

const commitOptions = computed(() => {
  return commits.value?.map(commit => ({
    label: commit.commit.message.split('\n')[0], // First line of message
    value: commit.sha,
    author: commit.commit.author?.name || 'Unknown',
    date: commit.commit.author?.date ? new Date(commit.commit.author.date).toLocaleDateString() : 'Unknown date'
  })) || []
})

async function handleDeploy(close: () => void) {
  if (selectedCommit.value && props.service) {
    isDeploying.value = true
    try {
      await $client.services.triggerPipeline.mutate({
        providerId: props.environment?.provider?.id as string,
        serviceId: props.service.id,
        sha: selectedCommit.value.value
      })
      props.close?.(selectedCommit.value.value)
      close()
    } catch (error) {
      console.error('Failed to trigger pipeline:', error)
    } finally {
      isDeploying.value = false
    }
  }
}

function handleClose(close: () => void) {
  props.close?.()
  close()
}
</script>