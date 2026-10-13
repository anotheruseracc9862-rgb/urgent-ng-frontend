import Link from 'next/link';
import Image from 'next/image';

export function PublicFooter() {
  return (
    <footer className="bg-cn-blue-900 text-white py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/assets/logo.png"
                alt="Urgent.ng"
                width={140}
                height={40}
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-cn-blue-200 mb-4 max-w-sm">
              Nigeria&apos;s trusted peer-to-peer errand marketplace. Connecting people with tasks to
              available runners nearby with safe pay on delivery.
            </p>
            <div className="text-sm text-cn-green-400">Part of the ConnectNigeria Network</div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="font-bold text-white mb-4">Marketplace</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/dashboard"
                  className="text-cn-blue-200 hover:text-white transition-colors"
                >
                  Open Business Workspace
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-cn-blue-200 hover:text-white transition-colors"
                >
                  Post an Errand
                </Link>
              </li>
              <li>
                <Link
                  href="/#earn-money"
                  className="text-cn-blue-200 hover:text-white transition-colors"
                >
                  Runner Earnings
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-cn-blue-200 hover:text-white transition-colors"
                >
                  Runner Pro &amp; Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Safety & Trust */}
          <div>
            <h4 className="font-bold text-white mb-4">Safety &amp; Trust</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/track"
                  className="text-cn-blue-200 hover:text-white transition-colors"
                >
                  Live Errand GPS Tracking
                </Link>
              </li>
              <li>
                <Link
                  href="/#trust-safety"
                  className="text-cn-blue-200 hover:text-white transition-colors"
                >
                  Safety &amp; Pay-on-Delivery Protocol
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="text-cn-blue-200 hover:text-white transition-colors"
                >
                  Dispute Resolution FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-white mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/help" className="text-cn-blue-200 hover:text-white transition-colors">
                  About Urgent.ng
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-cn-blue-200 hover:text-white transition-colors">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-cn-blue-200 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-cn-blue-200 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-cn-blue-200 hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-cn-blue-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-cn-blue-300">
            &copy; 2026 Urgent.ng Technologies Limited. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-sm text-cn-blue-300">
            <span>Lagos</span>
            <span>•</span>
            <span>Abuja</span>
            <span>•</span>
            <span>Port Harcourt</span>
            <span>•</span>
            <span>Ibadan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
