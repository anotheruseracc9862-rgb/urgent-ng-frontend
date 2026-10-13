export const ENV_VARS = {
  apiUrl: "NEXT_PUBLIC_API_URL",
  adminApiUrl: "NEXT_PUBLIC_ADMIN_API_URL",
} as const;

export const MEDIA_UPLOAD_DEFAULTS = {
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

const DEFAULT_API_URL = "http://127.0.0.1:4000/api/v1";
const DEFAULT_ADMIN_API_URL = `${DEFAULT_API_URL}/admin`;

export function getApiUrl(): string {
  return process.env[ENV_VARS.apiUrl] ?? DEFAULT_API_URL;
}

export function getAdminApiUrl(): string {
  return process.env[ENV_VARS.adminApiUrl] ?? DEFAULT_ADMIN_API_URL;
}
