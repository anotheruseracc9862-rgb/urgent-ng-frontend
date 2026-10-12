import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { AppThemeProvider } from "@/providers/theme-provider";
import { SonnerToaster } from "@/providers/sonner-provider";
import { TooltipProvider } from "@urgent/ui";

export const metadata: Metadata = {
  title: "Urgent.ng",
  description:
    "Urgent.ng — the errand marketplace connecting requesters with verified runners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
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
