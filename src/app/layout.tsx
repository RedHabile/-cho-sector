import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-chakra-petch",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "ECHO SECTOR — Tactical Top-Down Stealth Shooter",
  description:
    "Polished 60fps Bullet Echo-inspired tactical multiplayer arena shooter with raycasted flashlight cones, footstep sonar, explosive cover, and live leaderboards.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#06090f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${chakraPetch.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-[#06090f] font-sans text-slate-100 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
