<template>
  <!-- Left Column: Organization Tabs (72px) -->
  <div class="w-[72px] shrink-0 h-full bg-background border-r border-default flex flex-col items-center pb-3">
    <!-- Logo -->
    <div class="flex items-center justify-center h-(--ui-header-height) w-full shrink-0 mb-2 border-b border-default">
      <NuxtLink to="/">
        <UButton icon="custom:thunderso" size="sm" color="neutral" variant="link" class="w-full px-7 py-6 rounded-[0px]" />
      </NuxtLink>
    </div>

    <!-- Organization Tabs -->
    <div class="flex-1 flex flex-col items-center gap-2 w-full overflow-y-auto overflow-x-hidden scrollbar-none py-2">
      <template v-for="org in memberships" :key="org.id">
        <div class="relative group">
          <!-- Active indicator -->
          <div 
            v-if="selectedOrganization?.id === org.id"
            class="absolute left-[-2px] w-1 rounded-r-full bg-foreground h-5 top-1/2 -translate-y-1/2"
          ></div>
          
          <UTooltip :text="org.name" side="right">
            <UButton
              color="neutral"
              variant="ghost"
              class="w-11 h-11 p-0 rounded-[14px] overflow-hidden relative"
              :class="{ 'ring-2 ring-primary/90': selectedOrganization?.id === org.id }"
              @click="selectOrganization(org)"
            >
              <UAvatar :alt="org.name" size="md" class="w-full h-full rounded-[14px]" />
            </UButton>
          </UTooltip>
        </div>
      </template>
    </div>

    <!-- Add Organization -->
    <div class="flex items-center justify-center py-2 shrink-0">
      <UTooltip text="New workspace" side="right">
        <UButton
          to="/org/new"
          color="neutral"
          variant="ghost"
          class="w-11 h-11 rounded-[22px] hover:rounded-[14px] border-2 border-dashed border-default hover:border-primary transition-all duration-150"
        >
          <Icon name="tabler:plus" class="h-5 w-5" />
        </UButton>
      </UTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
const { selectedOrganization, memberships, setSelectedOrganization } = useMemberships();

function selectOrganization(org: any) {
  setSelectedOrganization(org.id);
  navigateTo(`/org/${org.id}`);
}
</script>
