import type { Metadata } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AppThemeProvider } from "@/providers/theme-provider";
import { SonnerToaster } from "@/providers/sonner-provider";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Urgent.ng Admin",
  description: "Urgent.ng internal administration application.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // All admin pages, including login/invitations, render per request for fresh script nonces.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AppThemeProvider nonce={nonce}>
          <QueryProvider>
            {children}
            <SonnerToaster />
          </QueryProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
