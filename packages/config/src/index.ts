export const ENV_VARS = {
  apiUrl: "NEXT_PUBLIC_API_URL",
  adminApiUrl: "NEXT_PUBLIC_ADMIN_API_URL",
} as const;

const DEFAULT_API_URL = "http://localhost:3000/api/v1";

export function getApiUrl(): string {
  return process.env[ENV_VARS.apiUrl] ?? DEFAULT_API_URL;
}

export function getAdminApiUrl(): string {
  return process.env[ENV_VARS.adminApiUrl] ?? DEFAULT_API_URL;
}
