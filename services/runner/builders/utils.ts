// Sanitize paths to ensure valid unix directory paths, trim leading/trailing slashes
export const sanitizePath = (path: string | undefined): string => {
  if (!path) return '';
  return path.replace(/[^a-zA-Z0-9._\-@#$%^&*+=~ /]|\/+/g, m => m.includes('/') ? '/' : '').replace(/^\/+|\/+$/g, '')
};