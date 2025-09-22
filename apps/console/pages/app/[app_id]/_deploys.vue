<template>
  <div>
    <h3>Events</h3>
    <div v-if="loading">Loading events...</div>
    <div v-else-if="error">Error fetching events: {{ error.message }}</div>
    <div v-else-if="events.length">
      <UTable
        :data="events"
        :columns="columns"
      />
    </div>
    <div v-else>No events found for this application.</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
});

const supabase = useSupabaseClient()
const { applicationSchema } = useApplications();

if (!applicationSchema.value) {
  throw Error('Application schema not found.')
}
const environment = applicationSchema.value?.environments?.[0];
const service = environment?.services?.[0];

const events = ref([])
const loading = ref(false)
const error = ref<{ message: string } | null>(null);

const UBadge = resolveComponent('UBadge')

const columns = [
  {
    accessorKey: 'pipeline_start',
    header: 'Started',
    cell: ({ row }) => {
      const date = new Date(row.getValue('pipeline_start')).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      return h('div', { class: 'font-medium' }, date)
    }
  },
  {
    accessorKey: 'pipeline_end',
    header: 'Ended',
    cell: ({ row }) => {
      const date = new Date(row.getValue('pipeline_end')).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      return h('div', { class: 'font-medium' }, date)
    }
  },
  {
    accessorKey: 'pipeline_state',
    header: 'State',
    cell: ({ row }) => {
      return h(UBadge, { color: 'primary', variant: 'subtle' }, () => row.getValue('pipeline_state'))
    }
  },
  {
    accessorKey: 'pipeline_metadata',
    header: 'Source',
    cell: ({ row }) => {
      const metadata = row.getValue('pipeline_metadata')
      if (metadata && metadata.revisionUrl) {
        return h('a', { href: metadata.revisionUrl, target: '_blank' }, metadata.revisionSummary)
      }
      return ''
    }
  }
];

const fetchEvents = async (envId: string) => {
  loading.value = true
  try {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('environment_id', envId as string)
      .is('deleted_at', null)
      .order('pipeline_start', { ascending: false })

    if (eventError) throw eventError

    events.value = eventData
  } catch (e: any) {
    error.value = { message: (e as Error).message || 'Error fetching events.' };
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (applicationSchema.value) {
    if (environment?.id) {
      fetchEvents(environment?.id);
    }
  }
});
</script>
