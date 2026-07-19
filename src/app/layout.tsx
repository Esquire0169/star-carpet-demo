import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl =
  process.env.GITHUB_PAGES === "true"
    ? "https://esquire0169.github.io/star-carpet-demo"
    : "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: "Star Carpet — демо редизайна",
    template: "%s · Star Carpet Demo",
  },
  description:
    "Демонстрационная версия редизайна Star Carpet: полный дизайн и ключевые сценарии без реального каталога и контактов.",
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
