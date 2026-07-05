import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { StatusAnnouncer } from "@/components/StatusAnnouncer";
import { ThemeApplier } from "@/components/ThemeApplier";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Catch-Up Companion",
  description:
    "Live captions, a lost-thread marker, and quick catch-up recaps for virtual meetings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeApplier />
        <StatusAnnouncer />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
