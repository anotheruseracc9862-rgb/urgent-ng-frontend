import { parseAdminEnvironment } from './env-schema';

export const env = parseAdminEnvironment(process.env);
