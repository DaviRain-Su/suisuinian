"use client";

import React, { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import { addComment } from "@/utils/suisuinian";

interface CommentFormProps {
  postPublicKey: PublicKey;
  parentCommentIndex?: number; // Changed from PublicKey to number (globalIndex)
  onCommentAdded: () => void;
  onCancel?: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  postPublicKey,
  parentCommentIndex,
  onCommentAdded,
  onCancel,
}) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { wallet } = useWallet();
  const program = useProgram();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet?.adapter.publicKey) {
      setError("Wallet not connected or program not initialized.");
      return;
    }
    if (!content.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Pass parentCommentIndex (can be undefined)
      await addComment(program, postPublicKey, content, parentCommentIndex);
      setContent("");
      onCommentAdded();
      if (onCancel) onCancel();
    } catch (err: any) {
      console.error("Error adding comment:", err);
      setError(err.message || "Failed to add comment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`mt-4 p-3 ${parentCommentIndex !== undefined ? "bg-white dark:bg-gray-800 border-l-4 border-blue-500 ml-4" : "bg-gray-100 dark:bg-gray-700"} rounded-lg transition-all`}>
      <h5 className="font-semibold text-md mb-2 text-gray-900 dark:text-white flex justify-between items-center">
        {parentCommentIndex !== undefined ? "Reply to Comment" : "Add a Comment"}
        {onCancel && (
          <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Cancel
          </button>
        )}
      </h5>
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={parentCommentIndex !== undefined ? 2 : 2}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white resize-none"
          placeholder={parentCommentIndex !== undefined ? "Write your reply..." : "Your comment..."}
          required
          maxLength={100} // Matches Rust constraint
          autoFocus={parentCommentIndex !== undefined}
        ></textarea>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
           <button
            type="submit"
            disabled={loading || !wallet?.adapter.publicKey || !content.trim()}
            className="py-1.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Posting..." : parentCommentIndex !== undefined ? "Reply" : "Comment"}
          </button>
        </div>
      </form>
    </div>
  );
};
