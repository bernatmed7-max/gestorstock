import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AnimatedBackground from "@/components/AnimatedBackground";
import "./globals.css";
import Script from 'next/script';

import FacebookSDKProvider from "@/components/providers/FacebookSDKProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Social CRM Omnicanal",
  description: "CRM omnicanal con IA para gestionar conversaciones",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen relative`}
      >
        <FacebookSDKProvider>
          <div className="fixed inset-0 z-[-1] opacity-80">
            <AnimatedBackground />
          </div>
          <div className="relative z-10 h-full">
            {children}
          </div>
        </FacebookSDKProvider>
      </body>
    </html>
  );
}
