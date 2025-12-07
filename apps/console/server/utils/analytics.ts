import { PostHog } from 'posthog-node';

export const trackServerEvent = async (event: string, properties: any = {}) => {
  try {
    const runtimeConfig = useRuntimeConfig();
    const posthog = new PostHog(
      runtimeConfig.public.posthogPublicKey as string,
      { host: runtimeConfig.public.posthogHost as string }
    );
    
    posthog.capture({
      distinctId: 'server',
      event,
      properties
    });
    
    await posthog.flush();
    await posthog.shutdown();
  } catch (e) {
    // Silently fail analytics
  }
};