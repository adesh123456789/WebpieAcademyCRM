import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebPie Academic Intelligence OS",
  description: "Offline-First Multi-Tenant Operating System for Coaching Institutes & Teachers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
