export default defineNuxtPlugin(async (nuxtApp) => {
  const { initializeSession } = useMemberships();
  await initializeSession();
});