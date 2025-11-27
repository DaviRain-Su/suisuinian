"use client";

import React, { useState, useCallback, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/hooks/useProgram";
import { fetchCommentsForPost } from "@/utils/suisuinian";
import { CommentForm } from "./CommentForm";
import { BN } from "@coral-xyz/anchor";

interface CompactCommentAccount {
  author: PublicKey;
  timestamp: number; // BN or number depending on parsing
  content: string;
  parentIndex: any; // BN from Anchor
  globalIndex: number; // Helper we added
}

interface FullComment {
  account: CompactCommentAccount;
  replies?: FullComment[];
}

interface PostCardProps {
  postPublicKey: PublicKey;
  postAccount: {
    author: PublicKey;
    timestamp: number;
    topic: string;
    content: string;
    commentCount: number;
  };
  refreshPosts: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  postPublicKey,
  postAccount,
  refreshPosts,
}) => {
  const program = useProgram();
  const [comments, setComments] = useState<FullComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [errorComments, setErrorComments] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  // replyTo is now the globalIndex (number) of the comment we are replying to
  const [replyTo, setReplyTo] = useState<number | undefined>(undefined);

  const buildCommentTree = (flatComments: any[]): FullComment[] => {
    const commentMap: { [key: number]: FullComment } = {};
    const roots: FullComment[] = [];

    // First pass: create nodes
    flatComments.forEach((c) => {
      const globalIdx = c.account.globalIndex;
      commentMap[globalIdx] = { ...c, replies: [] };
    });

    // Second pass: build tree
    flatComments.forEach((c) => {
      const globalIdx = c.account.globalIndex;
      const comment = commentMap[globalIdx];
      
      // Check parent index. Anchor returns BN for u64.
      const parentIdxBN = new BN(c.account.parentIndex);
      
      // Check if parent is u64::MAX (no parent)
      // 18446744073709551615 is u64::MAX
      const isRoot = parentIdxBN.toString() === "18446744073709551615";

      if (!isRoot) {
        const parentIdx = parentIdxBN.toNumber();
        const parent = commentMap[parentIdx];
        if (parent) {
          parent.replies?.push(comment);
        } else {
          // Parent missing (maybe strictly ordered pages issue?), fallback to root
          roots.push(comment);
        }
      } else {
        roots.push(comment);
      }
    });

    return roots;
  };

  const getComments = useCallback(async () => {
    if (!program || !showComments) return;
    setLoadingComments(true);
    setErrorComments(null);
    try {
      const fetchedComments = await fetchCommentsForPost(program, postPublicKey);
      const commentTree = buildCommentTree(fetchedComments);
      setComments(commentTree);
    } catch (err: any) {
      console.error("Error fetching comments:", err);
      setErrorComments(err.message || "Failed to fetch comments.");
    } finally {
      setLoadingComments(false);
    }
  }, [program, postPublicKey, showComments]);

  useEffect(() => {
    getComments();
  }, [getComments]);

  const handleCommentAdded = () => {
    getComments();
    refreshPosts();
    setReplyTo(undefined); 
  };

  const authorStr = postAccount.author.toBase58();
  const avatarColor = `hsl(${parseInt(authorStr.slice(0, 2), 16) * 4}, 70%, 60%)`;

  const renderCommentNode = (comment: FullComment, depth = 0) => {
    // Use globalIndex as key since we don't have unique Pubkeys for comments anymore
    const key = `comment-${comment.account.globalIndex}`;
    
    return (
      <div key={key} className={`flex gap-3 group ${depth > 0 ? "mt-3" : ""}`}>
        <div className={`flex-shrink-0 w-1 bg-gray-200 dark:bg-gray-700 rounded-full group-hover:bg-blue-400 transition-colors ${depth > 0 ? "mr-1" : ""}`}></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                {comment.account.author.toBase58().slice(0, 4)}...
             </span>
             <span className="text-xs text-gray-400">
                {new Date(new BN(comment.account.timestamp).toNumber() * 1000).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
             </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
            {comment.account.content}
          </p>
          
          <div className="mt-1">
            <button 
              onClick={() => setReplyTo(comment.account.globalIndex)}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium"
            >
              Reply
            </button>
          </div>

          {/* Render Replies */}
          {comment.replies && comment.replies.length > 0 && (
             <div className="ml-2 pl-2 border-l border-gray-100 dark:border-gray-800">
               {comment.replies.map(reply => renderCommentNode(reply, depth + 1))}
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: avatarColor }}
            >
              {authorStr.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                  {authorStr.slice(0, 4)}...{authorStr.slice(-4)}
                </span>
                {postAccount.topic && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
                    {postAccount.topic}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(postAccount.timestamp * 1000).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="pl-[52px]">
          <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed whitespace-pre-wrap">
            {postAccount.content}
          </p>
        
          <div className="mt-4 flex items-center gap-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-medium">
                {postAccount.commentCount.toString()} Comments
              </span>
            </button>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 p-6 pl-[52px]">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">
            Discussion ({postAccount.commentCount.toString()})
          </h4>
          
          <div className="space-y-4 mb-6">
            {loadingComments && (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
            
            {!loadingComments && comments.length === 0 && !errorComments && (
              <p className="text-sm text-gray-500 italic">No comments yet. Be the first!</p>
            )}
            
            {comments.map((comment) => renderCommentNode(comment))}
          </div>

          <CommentForm
            postPublicKey={postPublicKey}
            parentCommentIndex={replyTo}
            onCommentAdded={handleCommentAdded}
            onCancel={replyTo !== undefined ? () => setReplyTo(undefined) : undefined}
          />
        </div>
      )}
    </div>
  );
};
