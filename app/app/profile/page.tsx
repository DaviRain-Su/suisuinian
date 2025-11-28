"use client";

import { PostCard } from "@/components/PostCard";
import { useProgram } from "@/hooks/useProgram";
import { fetchPosts } from "@/utils/suisuinian";
import { PublicKey } from "@solana/web3.js";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";

interface PostAccount {
  author: PublicKey;
  timestamp: number;
  topic: string;
  content: string;
  commentCount: number;
}

interface FullPost {
  publicKey: PublicKey;
  account: PostAccount;
}

export default function ProfilePage() {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [posts, setPosts] = useState<FullPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getPosts = useCallback(async () => {
    if (!program || !publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const allPosts = await fetchPosts(program);
      // Filter posts by current user's public key
      const userPosts = (allPosts as FullPost[]).filter(
        post => post.account.author.toBase58() === publicKey.toBase58()
      );
      setPosts(userPosts);
    } catch (err: any) {
      console.error("Error fetching profile posts:", err);
      setError(err.message || "Failed to fetch posts.");
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    getPosts();
  }, [getPosts]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      totalPosts: posts.length,
      totalCommentsReceived: posts.reduce((acc, post) => acc + new BN(post.account.commentCount).toNumber(), 0),
      // Note: Total tips received would require fetching transaction history or storing it on-chain, 
      // which is not currently implemented in the contract state directly for efficient querying.
      // We can show total posts and total comments for now.
    };
  }, [posts]);

  if (!publicKey) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Connect Wallet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Please connect your wallet to view your profile.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <div className="flex items-center gap-6 mb-6">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg"
            style={{ backgroundColor: `hsl(${parseInt(publicKey.toBase58().slice(0, 2), 16) * 4}, 70%, 60%)` }}
          >
            {publicKey.toBase58().slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
            <p className="text-gray-500 dark:text-gray-400 font-mono text-sm mt-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg inline-block">
              {publicKey.toBase58()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.totalPosts}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Posts Created</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.totalCommentsReceived}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Comments Received</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Posts</h2>
      </div>

      <div className="space-y-6">
        {loading && (
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

        {error && (
          <div className="text-center py-12 bg-red-50 dark:bg-red-900/10 rounded-xl">
            <p className="text-red-500 font-medium">Error: {error}</p>
            <button onClick={getPosts} className="mt-2 text-sm text-red-600 underline">Retry</button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
            <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">No posts yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You haven&apos;t created any posts yet.</p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.publicKey.toBase58()}
            postPublicKey={post.publicKey}
            postAccount={post.account}
            refreshPosts={getPosts}
            onTopicClick={() => {}} // No-op on profile page for now, or could redirect to home with filter
          />
        ))}
      </div>
    </main>
  );
}
