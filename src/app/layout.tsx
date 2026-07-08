import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DevNav } from "@/components/dev/DevNav";
import { GameAudioController } from "@/components/audio/GameAudioController";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "역사 정복 — History Conquest",
  description: "실시간 팀 대항 역사 퀴즈 땅따먹기 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DevNav />
        <GameAudioController />
        {children}
      </body>
    </html>
  );
}
