import { api } from './client';
import type { ConsentType, PolicyVersion } from './types';

/** The published version and date of one policy (F1-02). Null when the API is unreachable. */
export async function getPolicy(type: ConsentType): Promise<PolicyVersion | null> {
  try {
    return await api<PolicyVersion>(`/reference/policies/${type}`);
  } catch {
    return null;
  }
}

export function formatPolicyDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}
