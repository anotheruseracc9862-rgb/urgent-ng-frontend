'use client';

import { createContext, useContext } from 'react';
import { JourneyPanel } from './journey-panel';
import type { JourneyView } from './journey';

interface JourneyValue {
  view: JourneyView;
}

export const JourneyContext = createContext<JourneyValue | null>(null);

/**
 * Where a page wants its progress steps: right under its own title, inside its own column, so
 * they line up with the page instead of floating above it. Renders nothing when the route's layout
 * has no journey to give (loading, error, or a page outside an errand).
 */
export function JourneyHere({ className }: { className?: string }) {
  const value = useContext(JourneyContext);
  return value ? <JourneyPanel view={value.view} className={className} /> : null;
}
