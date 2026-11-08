import { PwaRegistration } from "@/components/pwa/PwaRegistration";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-space" });

export const metadata: Metadata = {
  title: { default: "Smart Servicing Centre", template: "%s · Smart Servicing Centre" },
  applicationName: "Smart Servicing Centre",
  appleWebApp: { capable: true, title: "Smart Servicing", statusBarStyle: "default" },
  description: "Book trusted garages and mobile mechanics. Manage jobs, quotes and messages in one place.",
};

export const viewport: Viewport = { themeColor: "#1d4ed8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body className="min-h-screen antialiased"><PwaRegistration/>{children}</body>
    </html>
  );
}
