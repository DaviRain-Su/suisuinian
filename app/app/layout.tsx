"use client";

import "@/app/globals.css";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import { Header } from "@/components/Header";

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css");

const inter = Inter({ subsets: ["latin"] });

const WalletContextProvider = dynamic(
  () => import("../components/WalletContextProvider"),
  { ssr: false }
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50`}>
        <WalletContextProvider>
          <Header />
          <main className="pt-24 min-h-screen">
            {children}
          </main>
        </WalletContextProvider>
      </body>
    </html>
  );
}
