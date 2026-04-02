import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Property Hub — AI-First Property Management",
  description: "The intelligent property management platform. Recursive space hierarchies, AI-powered maintenance triage, fractional rent payments, and voice-first interfaces.",
  keywords: ["property management", "AI", "rent payments", "maintenance", "landlord", "tenant"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
