import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_ADMIN_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export type AdminEnvironment = z.infer<typeof envSchema>;

export function parseAdminEnvironment(source: Record<string, string | undefined>): AdminEnvironment {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const invalidNames = Object.keys(parsed.error.flatten().fieldErrors);
    throw new Error(`Invalid admin environment variables: ${invalidNames.join(', ')}`);
  }

  return parsed.data;
}
