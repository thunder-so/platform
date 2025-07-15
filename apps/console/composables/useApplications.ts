import { ref, computed, watch, readonly } from 'vue';
import { useRoute } from 'vue-router';
import { useSupabaseClient } from '#imports';
import { useMemberships } from './useMemberships';

export type Application = {
  id: string;
  name: string;
  display_name: string;
  organization_id: string;
};

export const useApplications = () => {
  const supabase = useSupabaseClient();
  const route = useRoute();
  const { selectedOrganization } = useMemberships();

  const applications = ref<Application[]>([]);
  const selectedApplication = ref<Application | null>(null);
  const isLoading = ref(false);

  const fetchApplications = async (orgId: string) => {
    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id, name, display_name, organization_id')
        .eq('organization_id', orgId);

      if (error) throw error;
      applications.value = data || [];
    } catch (e) {
      console.error('Error fetching applications:', e);
    } finally {
      isLoading.value = false;
    }
  };

  const setSelectedApplication = (appId: string) => {
    const app = applications.value.find(a => a.id === appId);
    if (app) {
      selectedApplication.value = app;
    }
  };

  watch(selectedOrganization, async (newOrg) => {
    if (newOrg?.id) {
      await fetchApplications(newOrg.id);
      const appIdFromRoute = route.params.app_id as string;
      if (appIdFromRoute) {
        setSelectedApplication(appIdFromRoute);
      }
    } else {
      applications.value = [];
      selectedApplication.value = null;
    }
  }, { immediate: true });

  watch(() => route.params.app_id, (newAppId) => {
    if (newAppId && applications.value.length > 0) {
      setSelectedApplication(newAppId as string);
    }
  });

  return {
    applications: readonly(applications),
    selectedApplication: readonly(selectedApplication),
    isLoading: readonly(isLoading),
    fetchApplications,
    setSelectedApplication,
  };
};
