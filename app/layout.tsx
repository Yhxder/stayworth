import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayWorth | Marriott Points Decision Tool",
  description:
    "Compare Marriott cash rates, points prices and the market reference value of 10,000 points before you book.",
  openGraph: {
    title: "StayWorth | Marriott Points Decision Tool",
    description:
      "Compare Marriott redemption value and estimate the effective cost of paid stays.",
    images: [
      {
        url: "https://raw.githubusercontent.com/Yhxder/stayworth/main/public/og.png",
        width: 1200,
        height: 630,
        alt: "StayWorth: Marriott points, made clearer.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StayWorth | Marriott Points Decision Tool",
    description:
      "Compare Marriott redemption value and estimate the effective cost of paid stays.",
    images: [
      "https://raw.githubusercontent.com/Yhxder/stayworth/main/public/og.png",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
