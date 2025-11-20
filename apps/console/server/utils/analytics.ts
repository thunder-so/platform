import { PostHog } from 'posthog-node';

export const trackServerEvent = (event: string, properties: any = {}) => {
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
    
    void posthog.flush();
  } catch (e) {
    // Silently fail analytics
  }
};