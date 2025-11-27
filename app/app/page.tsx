"use client";

import { PostCard } from "@/components/PostCard";
import { useProgram } from "@/hooks/useProgram";
import { fetchPosts } from "@/utils/suisuinian";
import { PublicKey } from "@solana/web3.js";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Define a type for the Post account data for better type safety
interface PostAccount {
  author: PublicKey;
  timestamp: number;
  topic: string;
  content: string;
  commentCount: number;
}

// Define a type for the full post object including its public key
interface FullPost {
  publicKey: PublicKey;
  account: PostAccount;
}

export default function Home() {
  const program = useProgram();
  const [posts, setPosts] = useState<FullPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorFetchingPosts, setErrorFetchingPosts] = useState<string | null>(null);

  const getPosts = useCallback(async () => {
    if (!program) return;
    setLoadingPosts(true);
    setErrorFetchingPosts(null);
    try {
      const fetchedPosts = await fetchPosts(program);
      setPosts(fetchedPosts as FullPost[]); 
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setErrorFetchingPosts(err.message || "Failed to fetch posts.");
    } finally {
      setLoadingPosts(false);
    }
  }, [program]);

  useEffect(() => {
    getPosts();
  }, [getPosts]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Latest Thoughts
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            See what&apos;s happening on the blockchain.
          </p>
        </div>
        
        <Link 
          href="/create"
          className="hidden md:inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-full text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors shadow-md hover:shadow-lg"
        >
          + New Post
        </Link>
      </div>

      <div className="space-y-6">
        {loadingPosts && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm animate-pulse border border-gray-100 dark:border-gray-700">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {errorFetchingPosts && (
          <div className="text-center py-12 bg-red-50 dark:bg-red-900/10 rounded-xl">
            <p className="text-red-500 font-medium">Error: {errorFetchingPosts}</p>
            <button onClick={getPosts} className="mt-2 text-sm text-red-600 underline">Retry</button>
          </div>
        )}

        {posts.length === 0 && !loadingPosts && !errorFetchingPosts && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
            <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">No posts yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get the conversation started.</p>
            <div className="mt-6">
              <Link
                href="/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                Create the first post
              </Link>
            </div>
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.publicKey.toBase58()}
            postPublicKey={post.publicKey}
            postAccount={post.account}
            refreshPosts={getPosts}
          />
        ))}
      </div>
      
      {/* Floating Action Button for Mobile */}
      <Link
        href="/create"
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center text-2xl hover:bg-blue-700 transition-transform hover:scale-110 active:scale-90 z-50"
      >
        +
      </Link>
    </main>
  );
}
