import { useApplications } from '~/composables/useApplications';

export default defineNuxtRouteMiddleware(async (to) => {
  const { setApplicationSchemaById } = useApplications();
  const appId = to.params.app_id as string | undefined;

  if (to.path.startsWith('/app/') && appId) {
    try {
      await callOnce(async () => {
        await setApplicationSchemaById(appId);
      });
    } catch (error) {
      return navigateTo('/404');
    }
  } else {
    const { applicationSchema } = useApplications();
    applicationSchema.value = null;
  }
});
