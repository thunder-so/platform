<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">Applications</h3>
      <UButton 
        color="neutral" 
        variant="outline" 
        size="lg" 
        trailing-icon="i-lucide-plus"
        label="New Application" 
        to="/new" 
      />
    </div>

    <div v-if="loading">Loading applications...</div>
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
      />
    </div>
    <div v-else>No applications found for this organization.</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'org'
})

const supabase = useSupabaseClient()
const { selectedOrganization } = useMemberships()

const applications = ref([])
const loading = ref(false)
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
    accessorKey: 'name', 
    // header: 'Name',
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
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => h(resolveComponent('NuxtLink'), { to: `/app/${row.getValue('id')}` }, () => row.getValue('name'))
  },
  { 
    accessorKey: 'stack_type', 
    header: 'Type',
    cell: ({ row }) => {
      if (row.getValue('stack_type') === 'SPA') {
        return h(UBadge, { color: 'success', variant: 'subtle' }, () => row.getValue('stack_type'))
      } else if (row.getValue('stack_type') === 'LAMBDA') {
        return h(UBadge, { color: 'secondary', variant: 'subtle' }, () => row.getValue('stack_type'))
      } else if (row.getValue('stack_type') === 'ECS') {
        return h(UBadge, { color: 'info', variant: 'subtle' }, () => row.getValue('stack_type'))
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
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
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
              ? 'i-lucide-arrow-up-narrow-wide'
              : 'i-lucide-arrow-down-wide-narrow'
            : 'i-lucide-arrow-up-down',
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

onMounted(async () => {
  loading.value = true
  try {
    const { data: appData, error: appError } = await supabase
      .from('applications')
      .select(`id, name, created_at,
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
          name: app.name,
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
