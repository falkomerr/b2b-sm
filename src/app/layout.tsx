import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppStoreProvider } from "@/lib/app-store";
import "./globals.css";

const geist = Geist({
  weight: ["300", "400", "500", "700"],
  variable: "--font-geist",
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smartfish B2B",
  description: "B2B кабинет для заказов без отображения цен",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geist.variable} antialiased`}>
        <AppStoreProvider>{children}</AppStoreProvider>
      </body>
    </html>
  );
}
