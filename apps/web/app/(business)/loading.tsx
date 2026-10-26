import { LoadingFrame } from '@/components/shell/loading-frame';

/**
 * Shown inside the signed-in shell while a route is being prepared. The sidebar and top bar stay;
 * the pulsing mascot fills the content area. Pages show their own card skeletons once they mount.
 */
export default function BusinessLoading() {
  return <LoadingFrame inShell />;
}
