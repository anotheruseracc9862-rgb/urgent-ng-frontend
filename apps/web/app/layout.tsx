import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/providers/root-providers";
import { AppThemeProvider } from "@/providers/theme-provider";
import { WebVitalsReporter } from "@/lib/observability/web-vitals-reporter";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Urgent.ng",
  description:
    "Urgent.ng — the errand marketplace connecting requesters with verified runners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AppThemeProvider>
          <WebVitalsReporter />
          <RootProviders>{children}</RootProviders>
        </AppThemeProvider>
      </body>
    </html>
  );
}
