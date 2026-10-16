import { LoadingFrame } from '@/components/shell/loading-frame';

/** Shown while a route's layout is still resolving: the app frame, never a fake page. */
export default function Loading() {
  return <LoadingFrame />;
}
