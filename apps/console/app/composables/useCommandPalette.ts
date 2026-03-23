import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export const useCommandPalette = () => {
  const commandOpen = ref(false)
  const commandSearch = ref('')

  const { memberships } = useMemberships()

  // apps-by-organization state (moved out of useApplications)
  const appsByOrg = useState<Record<string, any[]>>('appsByOrganization', () => ({}))
  const appsLoading = useState<boolean>('appsByOrganizationLoading', () => false)
  const appsError = useState<any | null>('appsByOrganizationError', () => null)

  const supabase = useSupabaseClient()

  const fetchApplicationsForOrganization = async (orgId: string) => {
    if (!orgId) return [] as any[]
    try {
      appsLoading.value = true
      appsError.value = null

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          name,
          display_name,
          organization_id,
          created_at,
          environments (
            id,
            name,
            display_name,
            region,
            services (
              id,
              name,
              display_name,
              stack_type,
              stack_version,
              owner,
              repo,
              branch,
              rootDir:root_dir,
              metadata,
              resources,
              environment_id,
              installation_id,
              updated_at
            )
          )
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .is('environments.deleted_at', null)
        .is('environments.services.deleted_at', null)

      if (error) throw error

      appsByOrg.value = {
        ...appsByOrg.value,
        [orgId]: (data || []) as any[]
      }

      return appsByOrg.value[orgId]
    } catch (e) {
      appsError.value = e
      appsByOrg.value[orgId] = []
      return [] as any[]
    } finally {
      appsLoading.value = false
    }
  }

  const commandGroups = computed(() => {
    return (memberships.value || []).map((org: any) => {
      const apps = (appsByOrg.value[org.id] || []).flatMap((app: any) =>
        (app.environments || []).flatMap((env: any) =>
          (env.services || []).map((service: any) => ({
            label: app.display_name || app.name || 'Untitled',
            suffix: `${env.region} • ${service.stack_type}`,
            to: `/app/${app.id}`,
            onSelect(e: Event) {
              e?.preventDefault?.()
              commandOpen.value = false
              navigateTo(`/app/${app.id}`)
            },
            icon:
              service.stack_type === 'STATIC'
                ? 'tabler:file'
                : service.stack_type === 'LAMBDA'
                ? 'tabler:lambda'
                : 'tabler:server'
          }))
        )
      )

      const items = [
        {
          label: 'Open workspace',
          suffix: org.name,
          icon: 'tabler:building',
          to: `/org/${org.id}`,
          onSelect(e: Event) {
            e?.preventDefault?.()
            commandOpen.value = false
            navigateTo(`/org/${org.id}`)
          }
        },
        ...apps
      ]

      return {
        id: `org-${org.id}`,
        label: org.name,
        items
      }
    })
  })

  function onPaletteSelect(item: any) {
    // kept for potential integrations; items use onSelect for immediate navigation
  }

  // keyboard shortcut: Ctrl/Cmd + K to open
  function keyHandler(e: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().includes('MAC')
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey
    if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      commandOpen.value = true
    }
  }

  onMounted(() => window.addEventListener('keydown', keyHandler))
  onBeforeUnmount(() => window.removeEventListener('keydown', keyHandler))

  // auto-fetch apps for memberships when available
  watch(
    () => memberships.value,
    (val) => {
      if (!val || !Array.isArray(val)) return
      for (const org of val) {
        if (!appsByOrg.value[org.id]) {
          void fetchApplicationsForOrganization(org.id)
        }
      }
    },
    { immediate: true }
  )

  return {
    commandOpen,
    commandSearch,
    commandGroups,
    // apps-by-org helpers
    appsByOrg,
    appsLoading,
    appsError,
    fetchApplicationsForOrganization,
    onPaletteSelect
  }
}

export default useCommandPalette
