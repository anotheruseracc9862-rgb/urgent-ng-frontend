import type { components } from '@urgent/api-client';
import { api, apiResponse } from '@/lib/api/client';

export type Rating = components['schemas']['RatingDto'];
export type AssignmentRatings = components['schemas']['AssignmentRatingsDto'];
export type MyRating = components['schemas']['MyRatingDto'];
export type SubmitRating = components['schemas']['SubmitRatingDto'];
export type EditRating = components['schemas']['EditRatingDto'];
export type Scores = components['schemas']['RatingScoresDto'];
export type Direction = 'RECEIVED' | 'GIVEN';

// Feature-owned and user-scoped: do not persist another user's private ratings.
export const ratingKeys = {
  all: (userId: string) => ['ratings', userId] as const,
  assignment: (userId: string, id: string) => ['ratings', userId, 'assignment', id] as const,
  list: (userId: string, direction: Direction) => ['ratings', userId, 'list', direction] as const,
};

export const ratingsApi = {
  assignment: (id: string, signal?: AbortSignal) => api<AssignmentRatings>(`/assignments/${encodeURIComponent(id)}/ratings`, { signal }),
  submit: (id: string, body: SubmitRating, key: string) => api<Rating>(`/assignments/${encodeURIComponent(id)}/ratings`, {
    method: 'POST', body, headers: { 'Idempotency-Key': key },
  }),
  edit: (id: string, body: EditRating) => api<Rating>(`/ratings/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  list: (direction: Direction, cursor?: string, signal?: AbortSignal) => apiResponse<MyRating[]>('/me/ratings', {
    query: { direction, cursor, limit: 20 }, signal,
  }),
};
