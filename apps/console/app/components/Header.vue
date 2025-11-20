<template>
  <UHeader class="[&>div]:max-w-none border-muted" :ui="{ container: 'lg:px-6' }" v-model:open="isMobileMenuOpen" :toggle="props.mobileMenuItems.length > 0">
    <template #left>

      <NuxtLink to="/">
        <UButton icon="custom:thunderso" size="sm" color="neutral" variant="ghost" class="p-3" />
      </NuxtLink>
      
      <UPopover
        v-model:open="isOrgPopoverOpen"
        mode="click"
        :content="{ align: 'start', side: 'bottom' }"
      >
        <UButton 
          size="lg"
          color="neutral" 
          variant="outline" 
          class="w-60 justify-between"
          trailing-icon="i-heroicons-chevron-down-20-solid"
        >
          <div class="flex items-center space-x-2">
            <UAvatar :alt="selectedOrganization?.name" size="xs" />
            <span>{{ selectedOrganization?.name }}</span>
          </div>
        </UButton>

        <template #content>
          <div class="py-1 w-64">
            <div v-for="item in organizationItems[0]" :key="item.id">
              <div @click="() => { item.click(); isOrgPopoverOpen = false }" class="flex justify-between items-center px-3 py-2 space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                <div class="flex items-center space-x-2">
                  <UAvatar :alt="item.name" size="xs" />
                  <span class="text-sm">{{ item.name }}</span>
                </div>
                <UBadge v-if="item.pending" size="md" color="secondary" variant="outline">Invited</UBadge>
                <UBadge v-else-if="item.isPaid" size="md" color="info" variant="outline">Pro</UBadge>
                <UBadge v-else size="md" color="neutral" variant="outline">Free</UBadge>
              </div>
            </div>
            <hr class="border-gray-200 dark:border-gray-700 mt-1 mb-1" />
            <NuxtLink to="/org/new" class="flex items-center px-3 py-2 space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
              <Icon name="i-heroicons-plus-circle-20-solid" size="sm" />
              <span class="text-sm">New workspace</span>
            </NuxtLink>
          </div>
        </template>
      </UPopover>
    </template>

    <template #right>
      <UPopover
        v-model:open="isNewPopoverOpen"
        mode="click"
        :content="{ align: 'end', side: 'bottom' }"
      >
        <UButton size="lg" icon="i-heroicons-plus-20-solid" color="neutral" variant="outline">
          New
        </UButton>
        
        <template #content>
          <div class="py-1">
            <template v-for="(group, index) in newMenuItems" :key="index">
              <div v-for="item in group" :key="item.to">
                <NuxtLink :to="item.to" class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Icon :name="item.icon" class="mr-2" />
                  <span>{{ item.label }}</span>
                </NuxtLink>
              </div>
              <hr v-if="index < newMenuItems.length - 1" class="border-gray-200 dark:border-gray-700" />
            </template>
          </div>
        </template>
      </UPopover>

      <UPopover
        v-model:open="isHelpPopoverOpen"
        mode="click"
        :content="{ align: 'end', side: 'bottom' }"
      >
        <UButton size="lg" icon="i-heroicons-question-mark-circle" color="neutral" variant="outline" />
        
        <template #content>
          <div class="py-1">
            <template v-for="(group, index) in helpMenuItems" :key="index">
              <div v-for="item in group" :key="item.label">
                <NuxtLink v-if="item.to" :to="item.to" target="_blank" class="flex items-center px-4 py-2 text-sm dark:text-gray-200 dark:hover:bg-gray-800">
                  <Icon :name="item.icon" class="mr-2" />
                  <span>{{ item.label }}</span>
                </NuxtLink>
                <div v-else-if="item.click" @click="() => { item.click(); isHelpPopoverOpen = false }" class="flex items-center px-4 py-2 text-sm dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer">
                  <Icon :name="item.icon" class="mr-2" />
                  <span>{{ item.label }}</span>
                </div>
              </div>
              <hr v-if="index < helpMenuItems.length - 1" class="border-gray-200 dark:border-gray-700" />
            </template>
          </div>
        </template>
      </UPopover>

      <UPopover
        v-model:open="isUserPopoverOpen"
        mode="click"
        :content="{ align: 'end', side: 'bottom' }"
      >
        <UButton size="lg" color="neutral" variant="ghost">
          <UAvatar :src="user?.user_metadata?.avatar_url" :alt="user?.user_metadata?.full_name" size="xs" class="h-5 w-5" />
        </UButton>

        <template #content>
          <div class="flex items-center px-4 py-3 space-x-3">
            <UAvatar :src="user?.user_metadata?.avatar_url" :alt="user?.user_metadata?.full_name" size="sm" />
            <div class="flex flex-col">
              <span class="text-sm">{{ user?.user_metadata?.full_name }}</span>
              <span class="text-xs text-gray-400">{{ user?.email }}</span>
            </div>
          </div>
          <hr class="border-gray-200 dark:border-gray-700" />
          <div class="py-1">
            <template v-for="(group, index) in userMenuItems" :key="index">
              <div v-for="item in group" :key="item.label">
                <NuxtLink v-if="item.to" :to="item.to" class="flex items-center px-4 py-2 text-sm dark:text-gray-200 dark:hover:bg-gray-800">
                  <Icon :name="item.icon" class="mr-2" />
                  <span>{{ item.label }}</span>
                </NuxtLink>
                <div v-else-if="item.click" @click="() => { item.click(); isUserPopoverOpen = false }" class="flex items-center px-4 py-2 text-sm dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer">
                  <Icon :name="item.icon" class="mr-2" />
                  <span>{{ item.label }}</span>
                </div>
              </div>
              <hr v-if="index < userMenuItems.length - 1" class="border-gray-200 dark:border-gray-700" />
            </template>
          </div>
        </template>
      </UPopover>
    </template>

    <template #body>
      <UNavigationMenu 
        v-if="props.mobileMenuItems.length > 0"
        :items="props.mobileMenuItems"
        orientation="vertical" 
        class="-mx-2.5"
        :ui="{
          link: 'p-3'
        }"
      />
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

interface Props {
  mobileMenuItems?: NavigationMenuItem[]
}

const props = withDefaults(defineProps<Props>(), {
  mobileMenuItems: () => []
})

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const { memberships, selectedOrganization, currentPlan } = useMemberships()
const isMobileMenuOpen = ref(false);

function selectOrganization(org: any) {
  selectedOrganization.value = org;
  navigateTo(`/org/${org.id}`);
}

const isOrgPopoverOpen = ref(false)

const isPaidOrg = (org: any) => {
  const activeSub = org.subscriptions
    ?.filter((sub: any) => sub.status !== 'canceled')
    ?.sort((a: any, b: any) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime())
    ?.[0];
  
  const isPaidSub = activeSub?.metadata?.price?.amount_type && 
    activeSub.metadata.price.amount_type !== 'free';
  
  return isPaidSub || org.orders?.length > 0 || false;
}

const organizationItems = computed(() => [
  memberships.value.map(org => ({
    ...org,
    label: org.name,
    isPaid: isPaidOrg(org),
    click: () => selectOrganization(org)
  }))
])

const isNewPopoverOpen = ref(false);
const newMenuItems = ref([
  [
    { 
      label: 'New Static Site', 
      to: '/new?stack_type=SPA',
      icon: 'streamline:browser-website-1-solid'
    },
    { 
      label: 'New Lambda Function', 
      to: '/new?stack_type=FUNCTION',
      icon: 'simple-icons:awslambda'
    },
    { 
      label: 'New Web Service', 
      to: '/new?stack_type=WEB_SERVICE',
      icon: 'mdi:web'
    },
  ],
]);

const isHelpPopoverOpen = ref(false);
const helpMenuItems = ref([
  [
    { 
      label: 'Docs', 
      icon: 'i-heroicons-book-open-20-solid',
      to: 'https://www.thunder.so/docs/'
    },
    { 
      label: 'Community',
      icon: 'ic:round-discord',
      to: 'https://discord.gg/nZwr6c5c6v' 
    },
    { 
      label: 'Feedback', 
      icon: 'i-heroicons-chat-bubble-left-right-20-solid',
      click: async () => { 
        // open feedback modal
      }
    },
  ]
]);

const isUserPopoverOpen = ref(false);
const userMenuItems = ref([
  [
    { 
      label: 'Account Settings', 
      icon: 'i-heroicons-user-circle-20-solid',
      to: '/profile' 
    },
    { 
      label: 'Logout', 
      icon: 'i-heroicons-arrow-right-on-rectangle-20-solid',
      click: async () => { 
        await supabase.auth.signOut(); 
        await navigateTo('/login'); 
      } 
    }
  ]
]);
</script>
