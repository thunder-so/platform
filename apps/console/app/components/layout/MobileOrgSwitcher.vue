<template>
  <div class="mb-4">
    <p class="text-xs font-medium text-muted uppercase tracking-wider mb-2 px-2">Workspaces</p>
    <div class="space-y-1">
      <button
        v-for="org in memberships"
        :key="org.id"
        @click="selectOrganization(org)"
        class="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted"
        :class="{ 'bg-muted': selectedOrganization?.id === org.id }"
      >
        <UAvatar :alt="org.name" size="xs" />
        <span class="flex-1 text-left">{{ org.name }}</span>
        <UBadge v-if="showActiveBadge && org.id === selectedOrganization?.id" size="sm" color="primary" variant="subtle">Active</UBadge>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  showActiveBadge?: boolean
}

withDefaults(defineProps<Props>(), {
  showActiveBadge: false
})

const { selectedOrganization, memberships, setSelectedOrganization } = useMemberships();

function selectOrganization(org: any) {
  setSelectedOrganization(org.id);
  navigateTo(`/org/${org.id}`);
}
</script>
