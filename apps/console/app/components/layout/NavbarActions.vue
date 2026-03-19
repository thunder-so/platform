<template>
  <div class="flex items-center gap-2">
    <!-- New Project Button -->
    <UPopover mode="click" :content="{ align: 'end', side: 'bottom' }">
      <UButton size="md" icon="tabler:plus" color="neutral" variant="outline">
        Project
      </UButton>
      
      <template #content>
        <div class="p-2 min-w-[200px]">
          <NuxtLink 
            v-for="item in newMenuItems" 
            :key="item.to"
            :to="item.to" 
            class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-md"
          >
            <Icon :name="item.icon" class="w-4 h-4" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </template>
    </UPopover>

    <!-- Help Menu -->
    <UPopover mode="click" :content="{ align: 'end', side: 'bottom' }">
      <UButton size="md" icon="tabler:question-mark" color="neutral" variant="outline" />
      
      <template #content>
        <div class="p-2 min-w-[200px]">
          <NuxtLink 
            v-for="item in helpMenuItems" 
            :key="item.label"
            :to="item.to" 
            target="_blank"
            class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-md"
          >
            <Icon :name="item.icon" class="w-4 h-4" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </template>
    </UPopover>

    <!-- User Menu -->
    <UPopover mode="click" :content="{ align: 'end', side: 'bottom' }">
      <UButton size="md" color="neutral" variant="ghost">
        <UAvatar :src="user?.user_metadata?.avatar_url" :alt="user?.user_metadata?.full_name" size="xs" />
      </UButton>

      <template #content>
        <div class="p-2 min-w-[200px]">
          <div class="flex items-center gap-2 px-2 py-2 border-b border-default mb-2">
            <UAvatar :src="user?.user_metadata?.avatar_url" :alt="user?.user_metadata?.full_name" size="sm" />
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium truncate">{{ user?.user_metadata?.full_name }}</span>
              <span class="text-xs text-muted truncate">{{ user?.email }}</span>
            </div>
          </div>
          
          <NuxtLink to="/profile" class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-md">
            <Icon name="tabler:user-hexagon" class="w-4 h-4" />
            Account Settings
          </NuxtLink>
          
          <div @click="logout" class="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-md cursor-pointer text-error">
            <Icon name="tabler:logout" class="w-4 h-4" />
            Logout
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser();
const supabase = useSupabaseClient();

// Logout
async function logout() {
  await supabase.auth.signOut();
  await navigateTo('/login');
}

// Menu items
const newMenuItems = [
  { label: 'New Static Site', to: '/new?stack_type=STATIC', icon: 'tabler:file' },
  { label: 'New Lambda Function', to: '/new?stack_type=LAMBDA', icon: 'tabler:lambda' },
  { label: 'New Fargate Service', to: '/new?stack_type=FARGATE', icon: 'tabler:server' },
];

const helpMenuItems = [
  { label: 'Docs', icon: 'tabler:book', to: 'https://www.thunder.so/docs/' },
  { label: 'Discord community', icon: 'tabler:brand-discord', to: 'https://discord.gg/nZwr6c5c6v' },
  { label: 'Send feedback', icon: 'tabler:messages', to: 'https://form.typeform.com/to/CSDLo4VO' },
];
</script>
