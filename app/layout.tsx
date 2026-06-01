import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "코디 (Chordy) · 코드체인지",
  description: "코드 전조 도구 · Chord transposition tool — Chord Change",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#fddcb0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>{children}</body>
    </html>
  );
}
