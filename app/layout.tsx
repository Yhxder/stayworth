import type { Metadata, Viewport } from "next";
import { THEME_INLINE_SCRIPT } from "./lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayWorth | Marriott Points Decision Tool",
  description:
    "Compare Marriott cash rates, points prices and the value of 10,000 points before you book. Sample snapshots, not live inventory.",
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

/** 浏览器界面色跟随画布；深浅各一条，交给系统偏好决定。 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#08090c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 首屏前写入已保存的外观覆盖，避免闪白或闪黑 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INLINE_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
