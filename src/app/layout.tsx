import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Kommunikationsplattform – Sichere private Nachrichten",
  description:
    "Professionelle Messaging-Plattform für sichere Kommunikation zwischen Kunde und Partner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
