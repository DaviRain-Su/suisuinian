"use client";

import { PostForm } from "@/components/PostForm";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
          Write a Suisuinian
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Share your thoughts permanently on the Solana blockchain.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 dark:border-gray-700">
        <PostForm 
          onPostCreated={() => router.push("/")} 
        />
      </div>
    </div>
  );
}
