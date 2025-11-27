import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import IDL from "@/idl/suisuinian.json";
import { Suisuinian } from "@/idl/suisuinian";

export const PROGRAM_ID = new PublicKey(IDL.address);

export const getProgram = (connection: Connection, wallet: AnchorWallet) => {
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  // Cast IDL to Suisuinian type for better type safety if needed, or let Anchor infer
  return new Program<Suisuinian>(IDL as any, provider);
};

export const fetchPosts = async (program: Program<Suisuinian>) => {
  const posts = await program.account.post.all();
  // Sort posts by timestamp, newest first
  posts.sort((a, b) => b.account.timestamp.toNumber() - a.account.timestamp.toNumber());
  return posts;
};

export const createPost = async (
  program: Program<Suisuinian>,
  topic: string,
  content: string
) => {
  const postAccount = Keypair.generate();

  await program.methods
    .createPost(topic, content)
    .accounts({
      post: postAccount.publicKey,
      author: program.provider.publicKey,
    })
    .signers([postAccount])
    .rpc();

  return postAccount.publicKey;
};

export const addComment = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey,
  content: string,
  parentIndex: number = -1 // Use -1 or similar to indicate "no parent", we'll convert to u64::MAX
) => {
  const postAccount = await program.account.post.fetch(postPublicKey);
  const commentCount = new BN(postAccount.commentCount);
  
  const COMMENTS_PER_PAGE = 10;
  const pageIndex = commentCount.divn(COMMENTS_PER_PAGE);
  const needsInit = commentCount.modn(COMMENTS_PER_PAGE) === 0;

  const [commentPagePublicKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("comment_page"),
      postPublicKey.toBuffer(),
      pageIndex.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );

  // If it's the first comment of a new page, we must initialize the page first.
  if (needsInit) {
    console.log("Initializing new comment page:", pageIndex.toString());
    try {
      await program.methods
      .initCommentPage()
      .accounts({
        post: postPublicKey,
        newPage: commentPagePublicKey,
        author: program.provider.publicKey,
      })
      .rpc();
    } catch (e) {
      console.log("Page might already exist, continuing...", e);
    }
  }

  // Convert parentIndex to u64 BN. If -1, use u64::MAX
  const parentIndexBN = parentIndex >= 0 
    ? new BN(parentIndex) 
    : new BN("18446744073709551615"); // u64::MAX

  await program.methods
    .addComment(content, parentIndexBN)
    .accounts({
      post: postPublicKey,
      commentPage: commentPagePublicKey,
      author: program.provider.publicKey,
    })
    .rpc();

  return commentPagePublicKey;
};

export const fetchCommentsForPost = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey
) => {
  console.log("Fetching comments for post (standard fetch):", postPublicKey.toBase58());
  
  try {
    const postAccount = await program.account.post.fetch(postPublicKey);
    const totalComments = new BN(postAccount.commentCount).toNumber();
    const COMMENTS_PER_PAGE = 10;
    
    // Calculate how many pages we have: ceil(total / 10)
    const totalPages = Math.ceil(totalComments / COMMENTS_PER_PAGE) || (totalComments > 0 ? 1 : 0);
    
    console.log(`Total comments: ${totalComments}, Pages to fetch: ${totalPages}`);

    const allComments: any[] = [];

    // Sequentially fetch pages (can be parallelized)
    for (let i = 0; i < totalPages; i++) {
      const pageIndexBN = new BN(i);
      const [commentPageKey] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("comment_page"),
          postPublicKey.toBuffer(),
          pageIndexBN.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      try {
        // Use standard Anchor fetch - it should handle the Vec<CompactComment> correctly now
        const commentPage = await program.account.commentPage.fetch(commentPageKey);
        
        // Process comments
        commentPage.comments.forEach((c: any, idx: number) => {
          // Anchor returns BN for numbers, convert as needed
          const timestamp = new BN(c.timestamp).toNumber();
          const parentIndex = c.parentIndex; // Keep as BN to handle u64::MAX
          const likeCount = c.likeCount; // u32 usually maps to number or BN, check logic

          const globalIndex = (i * COMMENTS_PER_PAGE) + idx;
          allComments.push({
            publicKey: new PublicKey(PublicKey.default), // Placeholder
            account: {
              author: c.author,
              timestamp: timestamp, 
              content: c.content,
              parentIndex: parentIndex,
              likeCount: likeCount,
              globalIndex: globalIndex,
              postKey: postPublicKey,
            }
          });
        });
      } catch (e) {
        console.warn(`Failed to fetch page ${i}`, e);
      }
    }

    return allComments;

  } catch (error) {
    console.error("Error in fetchCommentsForPost:", error);
    throw error;
  }
};

export const tipPost = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey,
  authorPublicKey: PublicKey,
  amountSol: number
) => {
  // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
  const amountLamports = new BN(amountSol * 1_000_000_000);

  await program.methods
    .tipPost(amountLamports)
    .accounts({
      post: postPublicKey,
      author: authorPublicKey,
      payer: program.provider.publicKey,
    })
    .rpc();
};

export const likePost = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey
) => {
  if (!program.provider.publicKey) {
    throw new Error("Wallet not connected.");
  }
  // UserLike PDA is auto-resolved by Anchor client based on IDL seeds
  
  await program.methods
    .likePost()
    .accounts({
      post: postPublicKey,
      user: program.provider.publicKey,
    })
    .rpc();
};

export const likeComment = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey,
  commentGlobalIndex: number
) => {
  if (!program.provider.publicKey) {
    throw new Error("Wallet not connected.");
  }

  const COMMENTS_PER_PAGE = 10;
  const pageIndex = Math.floor(commentGlobalIndex / COMMENTS_PER_PAGE);
  
  // Find the correct CommentPage PDA
  const [commentPagePublicKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("comment_page"),
      postPublicKey.toBuffer(),
      new BN(pageIndex).toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );

  // UserCommentLikes PDA is auto-resolved by Anchor client based on IDL seeds

  await program.methods
    .likeComment(new BN(commentGlobalIndex))
    .accounts({
      post: postPublicKey,
      commentPage: commentPagePublicKey,
      user: program.provider.publicKey,
    })
    .rpc();
};

export const hasLikedComment = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey,
  commentGlobalIndex: number,
  userPublicKey: PublicKey | null | undefined
): Promise<boolean> => {
  if (!userPublicKey) return false;

  const [userCommentLikesPublicKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_comment_likes"),
      userPublicKey.toBuffer(),
      postPublicKey.toBuffer(),
    ],
    PROGRAM_ID
  );

  try {
    const userCommentLikes = await program.account.userCommentLikes.fetch(userCommentLikesPublicKey);
    const bitmap = userCommentLikes.likesBitmap as number[]; // u8 array

    const byteIndex = Math.floor(commentGlobalIndex / 8);
    const bitOffset = commentGlobalIndex % 8;

    if (byteIndex >= bitmap.length) {
      return false;
    }

    const isSet = (bitmap[byteIndex] >> bitOffset) & 1;
    return isSet === 1;
  } catch (e) {
    return false;
  }
};

export const hasLikedPost = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey,
  userPublicKey: PublicKey | null | undefined
): Promise<boolean> => {
  if (!userPublicKey) {
    return false;
  }
  
  const [userLikePublicKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_like"),
      userPublicKey.toBuffer(),
      postPublicKey.toBuffer(),
    ],
    PROGRAM_ID
  );

  try {
    await program.account.userLike.fetch(userLikePublicKey);
    return true;
  } catch (e) {
    return false;
  }
};
