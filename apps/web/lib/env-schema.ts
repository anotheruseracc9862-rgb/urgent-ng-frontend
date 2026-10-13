import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().default(''),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().default(''),
});

export type WebEnvironment = z.infer<typeof envSchema>;

export function parseWebEnvironment(source: Record<string, string | undefined>): WebEnvironment {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const invalidNames = Object.keys(parsed.error.flatten().fieldErrors);
    throw new Error(`Invalid web environment variables: ${invalidNames.join(', ')}`);
  }

  return parsed.data;
}
