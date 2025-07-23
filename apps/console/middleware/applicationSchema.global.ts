import { useApplications } from '~/composables/useApplications';

export default defineNuxtRouteMiddleware(async (to) => {
  const { applicationSchema, setApplicationSchemaById } = useApplications();
  const appId = to.params.app_id as string | undefined;
  const currentAppId = applicationSchema.value?.id;
  if (appId) {
    if (appId !== currentAppId) {
      // console.log('middleware setApplicationSchemaById:', appId);
      await setApplicationSchemaById(appId);
    }
  } else {
    applicationSchema.value = {};
  }
});
