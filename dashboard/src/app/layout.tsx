import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Calling Agent Dashboard",
  description: "AI-powered Business Calling Agent Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`}>
      <body className="min-h-full flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-hidden pt-14 lg:pt-0">
          {children}
        </main>
      </body>
    </html>
  );
}
