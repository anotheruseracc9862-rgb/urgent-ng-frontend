import Link from 'next/link';
import { Button } from '@urgent/ui';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center bg-cn-blue-50 py-16">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-cn-blue-100 flex items-center justify-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-cn-blue-600"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-cn-blue-900 mb-4">
              404 — Page Not Found
            </h1>
            
            <p className="text-lg text-cn-blue-600 mb-8">
              Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/">Go to Homepage</Link>
              </Button>
              <Button size="lg" variant="ghost" className="border border-cn-blue-200" asChild>
                <Link href="/help">Get Help</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
