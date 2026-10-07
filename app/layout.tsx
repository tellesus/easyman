import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyMan — Take it easy, manager.",
  description: "A calmer day in hotel operations. Schedules, housekeeping, room checks, and shift pass-on in one workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
