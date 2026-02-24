import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QuickSite Payment",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export default function PayLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
