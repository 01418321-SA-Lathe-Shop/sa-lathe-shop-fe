import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "./appearance";
import { ApiSessionProvider } from "./api-session";
import { Suspense } from "react";
import "./workflows.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lathe Shop Control",
  description: "ระบบจัดการงานผลิตสำหรับโรงกลึงตามสั่ง",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AppThemeProvider><Suspense fallback={<p role="status">กำลังเตรียมพื้นที่ทำงาน…</p>}><ApiSessionProvider>{children}</ApiSessionProvider></Suspense></AppThemeProvider></body>
    </html>
  );
}
