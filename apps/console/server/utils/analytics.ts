import { PostHog } from 'posthog-node';

export const trackServerEvent = (event: string, properties: any = {}) => {
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
    
    void posthog.flush();
  } catch (e) {
    // Silently fail analytics
  }
};