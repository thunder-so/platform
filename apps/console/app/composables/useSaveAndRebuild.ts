export const useSaveAndRebuild = () => {
  const { $client } = useNuxtApp();
  const { applicationSchema, refreshApplicationSchema, currentService } = useApplications();
  const toast = useToast();

  const isSaving = ref(false);
  const isRebuilding = ref(false);

  const triggerBuild = async () => {
    if (!currentService.value?.id) return null;
    
    isRebuilding.value = true;
    try {
      const buildId = await $client.services.triggerBuild.mutate({ 
        service_id: currentService.value.id 
      });
      
      toast.add({ 
        title: 'Build triggered.', 
        description: "Click to view build details and logs.",
        color: 'success',
        progress: false,
        duration: 0,
        actions: [{
          label: 'View Build',
          color: 'primary',
          size: 'lg',
          to: `/app/${applicationSchema.value?.id}/builds/${buildId}`
        }]
      });
      
      return buildId;
    } catch (e: any) {
      toast.add({ title: 'Error triggering build', description: e.message, color: 'error' });
      throw e;
    } finally {
      isRebuilding.value = false;
    }
  };

  const saveOnly = async (saveFunction: () => Promise<void>, successTitle = 'Settings saved.') => {
    isSaving.value = true;
    try {
      await saveFunction();
      await refreshApplicationSchema();
      
      toast.add({ 
        title: successTitle,
        description: 'Rebuild your service to apply changes.', 
        color: 'success',
        progress: false,
        duration: 0,
        actions: [{
          label: 'Rebuild',
          color: 'primary',
          size: 'lg',
          loading: isRebuilding.value,
          onClick: async () => { void triggerBuild(); }
        }]
      });
    } catch (e: any) {
      toast.add({ title: 'Error saving', description: e.message, color: 'error' });
      throw e;
    } finally {
      isSaving.value = false;
    }
  };

  const saveAndRebuild = async (saveFunction: () => Promise<void>, successTitle = 'Settings saved.') => {
    isSaving.value = true;
    try {
      await saveFunction();
      await refreshApplicationSchema();
      await triggerBuild();
    } catch (e: any) {
      toast.add({ title: 'Error saving and rebuilding', description: e.message, color: 'error' });
      throw e;
    } finally {
      isSaving.value = false;
    }
  };

  return {
    isSaving,
    isRebuilding,
    saveOnly,
    saveAndRebuild,
    triggerBuild
  };
};