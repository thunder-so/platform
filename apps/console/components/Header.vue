<template>
  <header class="flex justify-between items-center py-2 px-2 border-b border-muted">
    <div class="flex items-center space-x-2">
      <NuxtLink to="/" class="text-xl font-bold">
        <UButton icon="custom:thunderso" size="md" color="neutral" variant="ghost"></UButton>
      </NuxtLink>
      <div class="relative" v-if="selectedOrganization">
        <button @click="dropdownOpen = !dropdownOpen" class="flex cursor-pointer justify-between items-center space-x-2 w-64 border rounded border-muted hover:border-neutral-600 px-3 py-2">
          <div class="flex items-center space-x-2">
            <UAvatar :alt="selectedOrganization.name" size="xs" />
            <span>{{ selectedOrganization.name }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <UBadge v-if="selectedOrganization.status === 'active'" icon="i-lucide-rocket" size="md" color="warning" variant="outline"></UBadge>
            <Icon name="i-heroicons-chevron-down-20-solid" />
          </div>
        </button>
        <div v-if="dropdownOpen" class="absolute mt-2 w-64 bg-default border border-accented shadow-lg z-10">
          <ul class="pt-1 pb-1">
            <li v-for="org in memberships" :key="org.id" @click="selectOrganization(org)"
              class="flex justify-between items-center px-3 py-2 space-x-2 cursor-pointer hover:bg-gray-800">
              <div class="flex items-center space-x-2">
                <UAvatar :alt="org.name" size="sm" />
                <span>{{ org.name }}</span>
              </div>
              <UBadge v-if="org.status === 'active'" icon="i-lucide-rocket" size="md" color="warning" variant="outline">Pro</UBadge>
            </li>
            <hr class="border-gray-700" />
            <li>
              <NuxtLink to="/org/new"
                class="flex items-center px-4 py-3 space-x-2 cursor-pointer hover:bg-gray-800">
                <Icon name="i-heroicons-plus-circle-20-solid" />
                <span>Create new organization</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="flex items-center space-x-2">
      <div class="relative">
        <button @click="newMenuOpen = !newMenuOpen" class="flex cursor-pointer items-center space-x-1 border rounded border-muted hover:border-neutral-600 px-3 py-2">
          <Icon name="i-heroicons-plus-20-solid" />
          <span>New</span>
        </button>
        <div v-if="newMenuOpen" class="absolute right-0 mt-2 w-48 bg-default border border-accented shadow-lg z-10">
          <ul class="pt-1 pb-1">
            <template v-for="(group, index) in newItems" :key="index">
              <li v-for="item in group" :key="item.to">
                <NuxtLink :to="item.to" class="block px-4 py-2 text-sm hover:bg-gray-800">{{ item.label }}</NuxtLink>
              </li>
              <hr v-if="index < newItems.length - 1" class="border-gray-700" />
            </template>
          </ul>
        </div>
      </div>
      <div class="relative">
        <button @click="userMenuOpen = !userMenuOpen" class="flex border border-transparent cursor-pointer px-3 py-2">
          <UAvatar :src="user?.user_metadata.avatar_url" :alt="user?.user_metadata.full_name" size="xs" />
        </button>
        <div v-if="userMenuOpen" class="absolute right-0 mt-2 w-48 bg-default border border-accented shadow-lg z-10">
          <ul class="pb-1">
            <li>
              <div class="flex items-center px-4 py-3 space-x-3">
                <UAvatar :src="user?.user_metadata.avatar_url" :alt="user?.user_metadata.full_name" size="sm" />
                <div class="flex flex-col">
                  <span>{{ user?.user_metadata.full_name }}</span>
                  <span class="text-xs text-gray-400">{{ user?.email }}</span>
                </div>
              </div>
            </li>
            <template v-for="(group, index) in userMenuItems" :key="index">
              <li v-for="item in group" :key="item.label" :class="{ 'cursor-pointer hover:bg-gray-800': !item.disabled, 'opacity-50 px-4 py-2 text-sm': item.disabled }">
                <NuxtLink v-if="item.to" :to="item.to" class="block px-4 py-2 text-sm">{{ item.label }}</NuxtLink>
                <span v-else-if="item.disabled" class="block text-sm">{{ item.label }}</span>
                <span v-else @click="item.click" class="block px-4 py-2 text-sm">{{ item.label }}</span>
              </li>
              <hr v-if="index < userMenuItems.length - 1" class="border-gray-700" />
            </template>
          </ul>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { $client } = useNuxtApp();
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const { memberships, selectedOrganization } = useMemberships()
const { applicationSchema } = useApplications();
const dropdownOpen = ref(false);
const newMenuOpen = ref(false);
const userMenuOpen = ref(false);

// console.log('components/Header selectedOrganization', selectedOrganization.value)
// console.log('components/Header applicationSchema', applicationSchema.value)

function selectOrganization(org: any) {
  selectedOrganization.value = org;
  dropdownOpen.value = false;
  navigateTo(`/org/${org.id}`);
}

const newItems = [
  [
    { label: 'New application', to: '/new' },
  ],
  // [
  //   { label: 'Static Site', to: '/static/new' },
  //   { label: 'Function', to: '/function/new' },
  //   { label: 'Web Service', to: '/web/new' },
  // ]
];

const userMenuItems = [
  [
    { label: 'Account Settings', to: '/profile' },
    { label: 'Logout', click: async () => { 
        await supabase.auth.signOut(); 
        await navigateTo('/login'); 
      } 
    }
  ]
];

const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error(error)
  } else {
    navigateTo('/login')
  }
}

</script>
