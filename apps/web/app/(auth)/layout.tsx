import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cn-blue-50 to-white flex flex-col">
      {/* Simple Header */}
      <header className="py-6">
        <div className="container mx-auto px-4">
          <Link href="/" className="inline-block">
            <Image
              src="/assets/logo.png"
              alt="Urgent.ng"
              width={140}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">{children}</main>

      {/* Simple Footer */}
      <footer className="py-6 text-center text-sm text-cn-blue-600">
        <div className="container mx-auto px-4">
          <p>
            &copy; 2026 Urgent.ng. By continuing, you agree to our{' '}
            <Link href="/terms" className="text-cn-green-600 hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-cn-green-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
