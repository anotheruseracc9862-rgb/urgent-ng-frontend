import { parseWebEnvironment } from './env-schema';

export const env = parseWebEnvironment(process.env);
