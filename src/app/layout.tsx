import type { Metadata } from "next";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

export const metadata: Metadata = {
  title: "Rentova — AI-First Property Management",
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
      <body>
        {children}
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: 'var(--nexus-bg-elevated)',
            color: 'var(--nexus-text)',
            border: '1px solid var(--nexus-border)',
            borderRadius: 'var(--nexus-radius-sm)',
            fontSize: 14,
            fontWeight: 500
          }
        }} />
      </body>
    </html>
  );
}
