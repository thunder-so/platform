// import { Checkout } from "@polar-sh/nuxt";

export default defineEventHandler((event) => {
  const {
    private: { polarAccessToken, polarCheckoutSuccessUrl, polarServer },
  } = useRuntimeConfig();

  const checkoutHandler = Checkout({
    accessToken: polarAccessToken,
    successUrl: polarCheckoutSuccessUrl,
    server: polarServer as "sandbox" | "production",
    theme: "dark", // Enforces the theme - System-preferred theme will be set if left omitted
  });

  return checkoutHandler(event);
});