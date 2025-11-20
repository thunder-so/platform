import { PostHog } from 'posthog-node';

export const trackServerEvent = async (event: string, properties: any = {}) => {
  try {
    const runtimeConfig = useRuntimeConfig();
    const posthog = new PostHog(
      runtimeConfig.public.posthogPublicKey,
      { host: runtimeConfig.public.posthogHost }
    );
    
    posthog.capture({
      distinctId: 'server',
      event,
      properties
    });
    
    await posthog.shutdown();
  } catch (e) {
    // Silently fail analytics
  }
};