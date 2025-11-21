<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">Projects</h3>
      <UButton 
        color="neutral" 
        variant="outline" 
        size="lg" 
        icon="tabler:plus"
        label="Import repository" 
        to="/new" 
      />
    </div>

    <div v-if="loading">
      <div class="flex flex-col gap-4 mt-7">
        <div v-for="i in 3" :key="i" class="space-y-4">
          <USkeleton class="h-6 w-full" />
        </div>
      </div>
    </div>
    <div v-else-if="error">
      <UAlert v-if="error" color="warning" variant="soft" class="mb-3">
        <template #title>{{ error.message }}</template>
      </UAlert>
    </div>

    <div v-else-if="applications.length">
      <UTable 
        :data="applications" 
        :columns="columns" 
        :column-visibility="columnVisibility"
        :sorting="sortState"
        @update:sorting="(state) => { sortState = state; saveSortState(state) }"
      />
    </div>
    <div v-else>
      <UEmpty
        icon="tabler:inbox"
        title="No projects found"
        description="There are no projects in this workspace yet. Import a Github repository to get started."
      >
        <template #actions>
          <UButton to="/new" color="primary" variant="solid" label="Import repository" />
        </template>
      </UEmpty>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'org'
})

const supabase = useSupabaseClient()
const { selectedOrganization } = useMemberships()

const applications = ref([])
const loading = ref(true)
const error = ref<{ message: string } | null>(null);
const orgId = selectedOrganization?.value?.id as string

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const columns = [
  { 
    accessorKey: 'id', 
    header: '',
    cell: ({ row }) => {
      return ''
    }
  },
  { 
    accessorKey: 'display_name', 
    meta: {
      style: {
        th: 'width: 50%',
        td: 'width: 50%'
      }
    },
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Name',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'tabler:arrows-up-down'
            : 'tabler:arrows-up-down'
          : 'tabler:arrows-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => h(resolveComponent('NuxtLink'), { 
      to: `/app/${row.getValue('id')}`, 
      class: 'font-medium text-highlighted hover:underline' 
    }, () => row.getValue('display_name'))
  },
  { 
    accessorKey: 'stack_type', 
    header: 'Type',
    cell: ({ row }) => {
      if (row.getValue('stack_type') === 'SPA') {
        return h(UBadge, { color: 'success', variant: 'subtle' }, () => 'STATIC')
      } else if (row.getValue('stack_type') === 'FUNCTION') {
        return h(UBadge, { color: 'secondary', variant: 'subtle' }, () => 'LAMBDA')
      } else if (row.getValue('stack_type') === 'WEB_SERVICE') {
        return h(UBadge, { color: 'info', variant: 'subtle' }, () => 'WEB SERVICE')
      }
    }
  },
  { 
    accessorKey: 'region', 
    // header: 'Region',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Region',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'tabler:arrows-up-down'
            : 'tabler:arrows-up-down'
          : 'tabler:arrows-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
  },
  { 
    accessorKey: 'updated_at', 
    // header: () => h('div', { class: 'text-right' }, 'Updated'),
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h('div', { class: 'text-right' }, [
        h(UButton, {
          color: 'neutral',
          variant: 'ghost',
          label: 'Updated',
          icon: isSorted
            ? isSorted === 'asc'
              ? 'tabler:arrows-up-down'
              : 'tabler:arrows-up-down'
            : 'tabler:arrows-up-down',
          class: '-mx-2.5',
          onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
        })
      ])
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('updated_at')).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      return h('div', { class: 'text-right font-medium' }, date)
    }
  }
];

const columnVisibility = ref({
  id: false
})

const sortState = ref([])

// Load sort state from localStorage
const loadSortState = () => {
  if (process.client) {
    const saved = localStorage.getItem(`table-sort-${orgId}`)
    return saved ? JSON.parse(saved) : []
  }
  return []
}

// Save sort state to localStorage
const saveSortState = (state) => {
  if (process.client) {
    localStorage.setItem(`table-sort-${orgId}`, JSON.stringify(state))
  }
}

// Initialize sort state
sortState.value = loadSortState()

onMounted(async () => {
  loading.value = true
  try {
    const { data: appData, error: appError } = await supabase
      .from('applications')
      .select(`id, name, display_name, created_at,
        environments(region,
          services(stack_type, updated_at)
        )
      `)
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    if (appError) throw appError

    const flattenedData = appData.flatMap(app => 
      app.environments.flatMap(env => 
        env.services.map(service => ({
          id: app.id,
          display_name: app.display_name,
          created_at: app.created_at,
          region: env.region,
          stack_type: service.stack_type,
          updated_at: service.updated_at
        }))
      )
    )

    applications.value = flattenedData
  } catch (e: any) {
    error.value = e
  } finally {
    loading.value = false
  }
})
</script>
