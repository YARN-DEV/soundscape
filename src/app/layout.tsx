import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Soundscape - Your Music Streaming Platform",
  description: "Stream your favorite music with Soundscape. Download tracks for offline listening.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Soundscape",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div style={{ display: "contents" }}>
            <OfflineIndicator />
            <InstallPrompt />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
