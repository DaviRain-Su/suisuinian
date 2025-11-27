"use client";

import React, { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import { createPost } from "@/utils/suisuinian";

interface PostFormProps {
  onPostCreated: () => void;
  className?: string;
}

export const PostForm = ({ onPostCreated, className = "" }: PostFormProps) => {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { wallet } = useWallet();
  const program = useProgram();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet?.adapter.publicKey) {
      setError("Please connect your wallet first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createPost(program, topic, content);
      setTopic("");
      setContent("");
      onPostCreated();
    } catch (err: any) {
      console.error("Error creating post:", err);
      setError(err.message || "Failed to create post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        <label htmlFor="topic" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Topic
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full px-4 py-3 bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 outline-none transition-colors text-lg placeholder-gray-400 dark:placeholder-gray-600"
          placeholder="What's this about?"
          maxLength={50}
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="content" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-transparent focus:border-purple-500 dark:focus:border-purple-400 focus:bg-white dark:focus:bg-black outline-none transition-all resize-none text-base placeholder-gray-400 dark:placeholder-gray-600"
          placeholder="Share your thoughts with the blockchain..."
          required
          maxLength={280}
        ></textarea>
        <div className="flex justify-end">
          <span className={`text-xs ${content.length > 250 ? 'text-red-500' : 'text-gray-400'}`}>
            {content.length}/280
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !wallet?.adapter.publicKey}
        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Publishing...
          </span>
        ) : (
          "Publish Suisuinian"
        )}
      </button>
    </form>
  );
};
