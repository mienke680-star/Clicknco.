import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Click & Co — Your business. One powerful platform.",
    template: "%s · Click & Co",
  },
  description:
    "Click & Co brings your website, funnels, customers, marketing, payments, products and automation together in one beautifully simple workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream text-charcoal">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
