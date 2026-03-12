import type { Metadata } from "next";
import { Outfit, JetBrains_Mono, Syne } from "next/font/google";
import "./globals.css";

const outfit    = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const syne      = Syne({ subsets: ["latin"], variable: "--font-syne", display: "swap", weight: ["600","700","800"] });

export const metadata: Metadata = {
  title: "NexChat",
  description: "Real-time encrypted messaging",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable} ${syne.variable}`}>
      <body className="font-sans h-full overflow-hidden bg-bg antialiased">{children}</body>
    </html>
  );
}
