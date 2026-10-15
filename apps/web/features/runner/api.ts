import type { components } from '@urgent/api-client';
import { api } from '@/lib/api/client';

export type RunnerProfile = components['schemas']['RunnerProfileDto'];
export type RunnerEligibility = components['schemas']['RunnerEligibilityDto'];
export type RunnerProfileInput = components['schemas']['UpdateRunnerProfileDto'];
export type RunnerCategory = components['schemas']['CategoryDto'];

export const runnerApi = {
  profile: () => api<RunnerProfile>('/runner/profile'),
  updateProfile: (input: RunnerProfileInput) =>
    api<RunnerProfile>('/runner/profile', { method: 'PUT', body: input }),
  updateAvailability: (availability: components['schemas']['RunnerAvailability']) =>
    api<RunnerProfile>('/runner/availability', { method: 'PUT', body: { availability } }),
  eligibility: () => api<RunnerEligibility>('/runner/eligibility'),
  categories: () => api<RunnerCategory[]>('/reference/categories'),
};
