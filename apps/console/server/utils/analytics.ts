import { PostHog } from 'posthog-node';

let posthogInstance: PostHog | null = null;
let posthogUnconfigured = false;

function getPostHog(): PostHog | null {
  if (posthogInstance) return posthogInstance;
  if (posthogUnconfigured) return null;

  try {
    const runtimeConfig = useRuntimeConfig();
    const apiKey = runtimeConfig.public.posthogPublicKey as string;
    const host = runtimeConfig.public.posthogHost as string;

    if (!apiKey || !host) {
      posthogUnconfigured = true;
      return null;
    }

    posthogInstance = new PostHog(apiKey, { host });
    return posthogInstance;
  } catch {
    posthogUnconfigured = true;
    return null;
  }
}

export const trackServerEvent = async (
  event: string,
  properties: any = {},
  options?: { distinctId?: string; email?: string; name?: string }
) => {
  const posthog = getPostHog();
  if (!posthog) return;

  try {
    const distinctId = options?.distinctId || 'server';

    posthog.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        ...(options?.email ? { user_email: options.email } : {}),
      }
    });

    await posthog.flush();
  } catch (e) {
    // Silently fail analytics
  }
};
