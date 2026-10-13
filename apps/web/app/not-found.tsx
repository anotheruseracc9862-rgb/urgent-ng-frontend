import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { StateCard } from '@/components/public/state-card';

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main className="flex flex-1 flex-col">
        <StateCard
          code="404"
          title="This page does not exist"
          actions={[
            { href: '/', label: 'Go to homepage', primary: true },
            { href: '/help', label: 'Get help' },
          ]}
        >
          <p>The page you are looking for may have moved or the link is wrong.</p>
        </StateCard>
      </main>
      <PublicFooter />
    </>
  );
}
