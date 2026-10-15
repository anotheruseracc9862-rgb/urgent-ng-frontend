"use client";

import { ThemeProvider } from "next-themes";

export function AppThemeProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <ThemeProvider nonce={nonce} attribute="class" forcedTheme="light" enableSystem={false} storageKey="urgent-admin-theme">
      {children}
    </ThemeProvider>
  );
}
