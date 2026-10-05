import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mienke & Luvhan — Our Wedding",
  description: "Our private wedding invitation and planning studio.",
  
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
