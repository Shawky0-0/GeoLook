import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GeoLook - AI-Powered Geographic Location Detection",
  description:
    "Upload any photo and GeoLook's AI vision model will analyze it to detect the real-world geographic location, displaying results on an interactive world map.",
  keywords: [
    "geolocation",
    "AI",
    "image analysis",
    "geographic detection",
    "map",
    "vision",
  ],
  authors: [{ name: "GeoLook" }],
  openGraph: {
    title: "GeoLook - AI-Powered Geographic Location Detection",
    description:
      "Upload any photo and AI will detect its real-world geographic location.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-50 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
