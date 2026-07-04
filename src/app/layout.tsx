import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hostal",
  description: "Sistema de gestión de hostal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-950">{children}</body>
    </html>
  );
}
