import { z } from 'zod';

const envSchema = z.object({
  // Public
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
});

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data;
