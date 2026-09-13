import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PublicAnalyticsTracker } from "@/components/analytics/PublicAnalyticsTracker";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { WhatsAppFloatingButton } from "@/components/public/WhatsAppFloatingButton";
import { Toaster } from "@/components/ui/sonner";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  keywords: [
    "hospedaje en Bolivia",
    "hospedaje Bolivia",
    "alojamiento en Bolivia",
    "alojamiento turístico en Bolivia",
    "hotel en Bolivia",
    "hostal en Bolivia",
    "hostales en Bolivia",
    "habitaciones en Bolivia",
    "reservar alojamiento en Bolivia",
    "hostal en Camargo",
    "hotel en Camargo",
    "alojamiento en Camargo",
    "habitaciones en Camargo",
    "reservas de hotel en Chuquisaca",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_BO",
    url: "/",
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: "/icono.jpg",
        width: 2048,
        height: 2048,
        alt: "Logo de Hostal Plaza Camargo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/icono.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icono.jpg",
    shortcut: "/icono.jpg",
    apple: "/icono.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ThemeToggle />
          <WhatsAppFloatingButton />
          <Suspense fallback={null}>
            <PublicAnalyticsTracker />
          </Suspense>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
