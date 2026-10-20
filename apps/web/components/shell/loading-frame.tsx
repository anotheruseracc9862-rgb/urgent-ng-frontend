import Image from 'next/image';

/**
 * What to show while the app or a route is being prepared: a pulsing mascot, no page content and
 * no placeholder blocks. By default it fills the screen. With `inShell` it fills only the content
 * area, so the sidebar and top bar stay in place. Page cards show their own skeletons.
 */
export function LoadingFrame({ inShell = false }: { inShell?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`grid place-items-center ${inShell ? 'min-h-[60vh]' : 'min-h-screen bg-panel'}`}
    >
      <Image
        src="/assets/mascot.png"
        alt=""
        width={96}
        height={112}
        priority
        className="h-28 w-auto motion-safe:animate-[mascot-pulse_1.4s_ease-in-out_infinite]"
      />
    </div>
  );
}
