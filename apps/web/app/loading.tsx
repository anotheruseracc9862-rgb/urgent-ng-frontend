import { LoadingFrame } from '@/components/shell/loading-frame';

/** Shown while a route layout is still resolving: a pulsing mascot, never a fake page. */
export default function Loading() {
  return <LoadingFrame />;
}
