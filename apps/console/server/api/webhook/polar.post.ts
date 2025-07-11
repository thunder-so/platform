// import { Webhooks } from "@polar-sh/nuxt";
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'

export default defineEventHandler((event) => {
  const {
    private: { polarWebhookSecret },
  } = useRuntimeConfig();

  const webhooksHandler = Webhooks({
    webhookSecret: polarWebhookSecret,
    onPayload: async (payload) => {
      // Handle the payload
      // No need to return an acknowledge response
    },
  });

  return webhooksHandler(event);
});