// export default defineNuxtPlugin(async (nuxtApp) => {
//   const { setSelectedApplication } = useApplications();
//   const route = useRoute();
//   const appId = route.params.app_id as string;
//   if (appId) {
//     // console.log('plugin: Setting selected application:', appId);
//     await setSelectedApplication(appId);
//   }
// });