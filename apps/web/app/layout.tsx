import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { AppThemeProvider } from "@/providers/theme-provider";
import { SonnerToaster } from "@/providers/sonner-provider";
import { TooltipProvider } from "@urgent/ui";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
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
          <QueryProvider>
            <TooltipProvider>
              {children}
              <SonnerToaster />
            </TooltipProvider>
          </QueryProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
