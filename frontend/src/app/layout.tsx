import type { Metadata } from "next";
import type { Viewport } from "next";
import { UiLanguageProvider } from "@/lib/i18n/uiLanguage";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAYTUS RTT System",
  description: "Real-time Korean, English, Chinese, and Japanese translation",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/images/rtt-speaking-profile-icon.png",
        type: "image/png",
      },
    ],
    shortcut: ["/images/rtt-speaking-profile-icon.png"],
    apple: [
      {
        url: "/images/rtt-speaking-profile-icon.png",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "KAYTUS RTT",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <UiLanguageProvider>{children}</UiLanguageProvider>
      </body>
    </html>
  );
}
