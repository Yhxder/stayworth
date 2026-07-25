import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayWorth | Marriott Points Decision Tool",
  description:
    "A low-fidelity prototype for comparing Marriott cash rates, points prices, and the net cost of paid stays.",
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
