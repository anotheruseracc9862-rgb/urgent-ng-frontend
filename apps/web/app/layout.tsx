import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/providers/root-providers";
import { AppThemeProvider } from "@/providers/theme-provider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Urgent.ng",
  description:
    "Urgent.ng — the errand marketplace connecting requesters with verified runners.",
  // The tab icon follows the device's light or dark setting. /favicon.ico (app/) is the fallback.
  icons: {
    icon: [
      { url: "/icons/favicon-light.png", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/icons/favicon-dark.png", type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AppThemeProvider>
          <RootProviders>{children}</RootProviders>
        </AppThemeProvider>
      </body>
    </html>
  );
}
