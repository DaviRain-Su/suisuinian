"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { usePathname } from "next/navigation";

export const Header = () => {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-80 transition-opacity">
            Suisuinian
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors ${
                pathname === "/" 
                  ? "text-gray-900 dark:text-white" 
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Explore
            </Link>
            <Link 
              href="/create" 
              className={`text-sm font-medium transition-colors ${
                pathname === "/create" 
                  ? "text-gray-900 dark:text-white" 
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Write
            </Link>
            <Link 
              href="/profile" 
              className={`text-sm font-medium transition-colors ${
                pathname === "/profile" 
                  ? "text-gray-900 dark:text-white" 
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Profile
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/create"
            className="md:hidden text-sm font-medium text-blue-600 dark:text-blue-400"
          >
            Write
          </Link>
          <WalletMultiButton className="!bg-gray-900 !h-9 !px-4 !text-sm !font-medium hover:!bg-gray-800 dark:!bg-white dark:!text-gray-900 dark:hover:!bg-gray-100 transition-all rounded-full" />
        </div>
      </div>
    </header>
  );
};
