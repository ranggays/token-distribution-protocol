import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { VeloraChainProvider } from "@/lib/velora-chain";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velora - Token release workspace",
  description:
    "Velora helps teams plan predictable token releases with configurable schedules, locked allocations, and clear recipient claims.",
  icons: {
    icon: "/seo/velora4.svg",
    apple: "/seo/velora4.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <VeloraChainProvider>{children}</VeloraChainProvider>
        <Analytics />
      </body>
    </html>
  );
}
