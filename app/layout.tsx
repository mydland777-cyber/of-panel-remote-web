import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "O&F Panel",
  description: "O&F Panel Remote",
  icons: {
    icon: "/of-panel-icon.png",
    shortcut: "/of-panel-icon.png",
    apple: "/of-panel-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "O&F Panel",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}