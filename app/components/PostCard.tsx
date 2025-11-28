"use client";

import React, { useState, useCallback, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/hooks/useProgram";
import { 
  fetchCommentsForPost, 
  likePost, 
  tipPost, 
  likeComment, 
  getUserInteractionState 
} from "@/utils/suisuinian";
import { CommentForm } from "./CommentForm";
import { BN } from "@coral-xyz/anchor";
import { toast } from "react-hot-toast";

interface CompactCommentAccount {
  author: PublicKey;
  timestamp: number; 
  content: string;
  parentIndex: any; // BN from Anchor
  likeCount: number;
  globalIndex: number; 
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
  const [replyTo, setReplyTo] = useState<number | undefined>(undefined);

  // Interaction State
  const [postLiked, setPostLiked] = useState(false);
  const [commentLikesBitmap, setCommentLikesBitmap] = useState<number[] | null>(null);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  
  // Tipping State
  const [isTipping, setIsTipping] = useState(false);
  const [tipAmount, setTipAmount] = useState("");
  const [isTipLoading, setIsTipLoading] = useState(false);

  const buildCommentTree = (flatComments: any[]): FullComment[] => {
    const commentMap: { [key: number]: FullComment } = {};
    const roots: FullComment[] = [];

    flatComments.forEach((c) => {
      const globalIdx = c.account.globalIndex;
      commentMap[globalIdx] = { ...c, replies: [] };
    });

    flatComments.forEach((c) => {
      const globalIdx = c.account.globalIndex;
      const comment = commentMap[globalIdx];
      
      const parentIdxBN = new BN(c.account.parentIndex);
      const isRoot = parentIdxBN.toString() === "18446744073709551615";

      if (!isRoot) {
        const parentIdx = parentIdxBN.toNumber();
        const parent = commentMap[parentIdx];
        if (parent) {
          parent.replies?.push(comment);
        } else {
          roots.push(comment);
        }
      } else {
        roots.push(comment);
      }
    });

    return roots;
  };

  const fetchInteractionState = useCallback(async () => {
    if (!program || !program.provider.publicKey) return;
    try {
      const state = await getUserInteractionState(
        program, 
        postPublicKey, 
        program.provider.publicKey
      );
      setPostLiked(state.postLiked);
      setCommentLikesBitmap(state.commentLikesBitmap);
    } catch (e) {
      console.error("Error fetching interaction state", e);
    }
  }, [program, postPublicKey]);

  useEffect(() => {
    fetchInteractionState();
  }, [fetchInteractionState]);

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

  const handleLikePost = async () => {
    if (!program || isLikeLoading || postLiked) return;
    setIsLikeLoading(true);
    try {
      console.log("Liking post:", postPublicKey.toBase58());
      await likePost(program, postPublicKey);
      setPostLiked(true);
      toast.success("Post liked!");
    } catch (e) {
      console.error("Failed to like post:", e);
      toast.error("Failed to like post");
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleTipPost = async () => {
    if (!program || isTipLoading || !tipAmount) return;
    setIsTipLoading(true);
    try {
      console.log(`Tipping post ${postPublicKey.toBase58()} with ${tipAmount} SOL`);
      await tipPost(program, postPublicKey, postAccount.author, parseFloat(tipAmount));
      setIsTipping(false);
      setTipAmount("");
      toast.success(`Successfully tipped ${tipAmount} SOL!`);
    } catch (e: any) {
      console.error("Failed to tip post:", e);
      toast.error(`Failed to send tip: ${e.message || "Unknown error"}`);
    } finally {
      setIsTipLoading(false);
    }
  };

  const checkCommentLiked = (globalIndex: number) => {
    if (!commentLikesBitmap) return false;
    const byteIndex = Math.floor(globalIndex / 8);
    const bitOffset = globalIndex % 8;
    if (byteIndex >= commentLikesBitmap.length) return false;
    return ((commentLikesBitmap[byteIndex] >> bitOffset) & 1) === 1;
  };

  const handleLikeComment = async (globalIndex: number) => {
    if (!program || checkCommentLiked(globalIndex)) return;
    
    // Optimistic update (local only for bitmap)
    const newBitmap = [...(commentLikesBitmap || new Array(128).fill(0))];
    const byteIndex = Math.floor(globalIndex / 8);
    const bitOffset = globalIndex % 8;
    if (byteIndex < newBitmap.length) {
      newBitmap[byteIndex] |= (1 << bitOffset);
      setCommentLikesBitmap(newBitmap);
    }

    try {
      await likeComment(program, postPublicKey, globalIndex);
      getComments(); // Refresh to get updated like count from chain
    } catch (e) {
      console.error("Failed to like comment", e);
      // Revert if needed, or just refetch state
      fetchInteractionState();
    }
  };

  const authorStr = postAccount.author.toBase58();
  const avatarColor = `hsl(${parseInt(authorStr.slice(0, 2), 16) * 4}, 70%, 60%)`;

  const renderCommentNode = (comment: FullComment, depth = 0) => {
    const key = `comment-${comment.account.globalIndex}`;
    const isLiked = checkCommentLiked(comment.account.globalIndex);
    
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
          
          <div className="mt-1 flex items-center gap-3">
            <button 
              onClick={() => setReplyTo(comment.account.globalIndex)}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium"
            >
              Reply
            </button>
            
            <button
              onClick={() => handleLikeComment(comment.account.globalIndex)}
              disabled={isLiked}
              className={`flex items-center gap-1 text-xs transition-colors ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}
            >
              <svg className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : "none"}`} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{comment.account.likeCount || 0}</span>
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
        {/* Header */}
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

        {/* Content */}
        <div className="pl-[52px]">
          <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed whitespace-pre-wrap">
            {postAccount.content}
          </p>
        
          {/* Actions Bar */}
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700/50">
            <div className="flex items-center gap-6">
              {/* Comment Toggle */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm font-medium">
                  {postAccount.commentCount.toString()}
                </span>
              </button>

              {/* Like Button */}
              <button
                onClick={handleLikePost}
                disabled={postLiked || isLikeLoading}
                className={`flex items-center gap-2 transition-colors group ${
                  postLiked ? "text-red-500" : "text-gray-500 hover:text-red-500 dark:text-gray-400"
                }`}
              >
                <svg 
                  className={`w-5 h-5 group-hover:scale-110 transition-transform ${postLiked ? "fill-current" : "none"}`} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-sm font-medium">
                  {postLiked ? "Liked" : "Like"}
                </span>
              </button>

              {/* Tip Button */}
              <button
                onClick={() => setIsTipping(!isTipping)}
                className="flex items-center gap-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Tip</span>
              </button>
            </div>
          </div>

          {/* Tipping Input Area */}
          {isTipping && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2 animate-fade-in-down">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Tip Amount (SOL):</span>
              <input
                type="number"
                step="0.01"
                min="0.001"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                className="w-24 px-2 py-1 text-sm rounded border border-green-200 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                placeholder="0.1"
              />
              <button
                onClick={handleTipPost}
                disabled={!tipAmount || isTipLoading}
                className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isTipLoading ? "Sending..." : "Send"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
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
