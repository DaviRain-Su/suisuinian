import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import IDL from "@/idl/suisuinian.json";
import { Suisuinian } from "@/idl/suisuinian";

export const PROGRAM_ID = new PublicKey(IDL.address);

export const getProgram = (connection: Connection, wallet: AnchorWallet) => {
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  return new Program<Suisuinian>(IDL as any, provider);
};

// --- User Profile Methods ---

export const initUserProfile = async (program: Program<Suisuinian>) => {
  // Anchor 0.30+ automatically resolves PDAs if seeds are simple/contextual
  // But for init, sometimes we explicitly pass it.
  // Let's try passing it. If type error persists, we might need to cast or check IDL.
  // Actually, let's try *not* passing it if the error suggests it's not expected.
  // Re-reading error: "Object literal may only specify known properties, and 'userProfile' does not exist..."
  // This strongly implies it's being auto-resolved or the name is wrong.
  
  // Let's try checking if we can just rely on auto-resolution for userProfile since it uses 'authority' which is passed.
  
  await program.methods
    .initUserProfile()
    .accounts({
      authority: program.provider.publicKey,
    })
    .rpc();
    
  // We recalculate PDA just to return it
  const [userProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), program.provider.publicKey!.toBuffer()],
    PROGRAM_ID
  );
  return userProfilePda;
};

export const getUserProfile = async (program: Program<Suisuinian>, userPublicKey: PublicKey) => {
  const [userProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), userPublicKey.toBuffer()],
    PROGRAM_ID
  );
  return await program.account.userProfile.fetchNullable(userProfilePda);
};

// --- Existing Methods (Updated for UserProfile) ---

export const fetchPosts = async (program: Program<Suisuinian>) => {
  const posts = await program.account.post.all();
  posts.sort((a, b) => b.account.timestamp.toNumber() - a.account.timestamp.toNumber());
  return posts;
};

export const createPost = async (
  program: Program<Suisuinian>,
  topic: string,
  content: string
) => {
  const postAccount = Keypair.generate();
  
  // Derive User Profile PDA (needed for stats update)
  const [userProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), program.provider.publicKey!.toBuffer()],
    PROGRAM_ID
  );

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

export const tipPost = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey,
  authorPublicKey: PublicKey,
  amountSol: number
) => {
  const amountLamports = new BN(Math.floor(amountSol * 1_000_000_000));

  // Derive Author's Profile PDA (to update their tip count)
  const [authorProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), authorPublicKey.toBuffer()],
    PROGRAM_ID
  );

  await program.methods
    .tipPost(amountLamports)
    .accounts({
      post: postPublicKey,
      author: authorPublicKey,
    })
    .rpc();
};

export const likePost = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey
) => {
  // We need the post account to get the author
  const postAccount = await program.account.post.fetch(postPublicKey);
  const authorPublicKey = postAccount.author;

  // Derive Author's Profile PDA
  const [authorProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), authorPublicKey.toBuffer()],
    PROGRAM_ID
  );

  await program.methods
    .likePost()
    .accounts({
      post: postPublicKey,
      author: authorPublicKey,
    })
    .rpc();
};

// ... Keep other methods (addComment, likeComment, followUser, etc.) unchanged ...

export const addComment = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey,
  content: string,
  parentIndex: number = -1 
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

  if (needsInit) {
    try {
      await program.methods
      .initCommentPage()
      .accounts({
        post: postPublicKey,
        newPage: commentPagePublicKey,
      })
      .rpc();
    } catch (e) {
      console.log("Page might already exist, continuing...", e);
    }
  }

  const parentIndexBN = parentIndex >= 0 
    ? new BN(parentIndex) 
    : new BN("18446744073709551615"); 

  await program.methods
    .addComment(content, parentIndexBN)
    .accounts({
      post: postPublicKey,
      commentPage: commentPagePublicKey,
    })
    .rpc();

  return commentPagePublicKey;
};

export const fetchCommentsForPost = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey
) => {
  try {
    const postAccount = await program.account.post.fetch(postPublicKey);
    const totalComments = new BN(postAccount.commentCount).toNumber();
    const COMMENTS_PER_PAGE = 10;
    
    const totalPages = Math.ceil(totalComments / COMMENTS_PER_PAGE) || (totalComments > 0 ? 1 : 0);
    
    const allComments: any[] = [];

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
        const commentPage = await program.account.commentPage.fetch(commentPageKey);
        
        commentPage.comments.forEach((c: any, idx: number) => {
          const timestamp = new BN(c.timestamp).toNumber();
          const parentIndex = c.parentIndex;
          const likeCount = c.likeCount; 

          const globalIndex = (i * COMMENTS_PER_PAGE) + idx;
          allComments.push({
            publicKey: new PublicKey(PublicKey.default),
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

export const likeComment = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey,
  commentGlobalIndex: number
) => {
  const COMMENTS_PER_PAGE = 10;
  const pageIndex = Math.floor(commentGlobalIndex / COMMENTS_PER_PAGE);
  
  const [commentPagePublicKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("comment_page"),
      postPublicKey.toBuffer(),
      new BN(pageIndex).toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );

  await program.methods
    .likeComment(new BN(commentGlobalIndex))
    .accounts({
      post: postPublicKey,
      commentPage: commentPagePublicKey,
    })
    .rpc();
};

export const getUserInteractionState = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey,
  userPublicKey: PublicKey | null | undefined
): Promise<{ postLiked: boolean; commentLikesBitmap: number[] | null }> => {
  if (!userPublicKey) {
    return { postLiked: false, commentLikesBitmap: null };
  }

  try {
    const [userLikePublicKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_like"),
        userPublicKey.toBuffer(),
        postPublicKey.toBuffer(),
      ],
      PROGRAM_ID
    );

    const [userCommentLikesPublicKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_comment_likes"),
        userPublicKey.toBuffer(),
        postPublicKey.toBuffer(),
      ],
      PROGRAM_ID
    );

    const [userLikeAccount, userCommentLikesAccount] = await Promise.all([
      program.account.userLike.fetchNullable(userLikePublicKey),
      program.account.userCommentLikes.fetchNullable(userCommentLikesPublicKey),
    ]);

    return {
      postLiked: !!userLikeAccount,
      commentLikesBitmap: userCommentLikesAccount ? (userCommentLikesAccount.likesBitmap as number[]) : null,
    };
  } catch (e) {
    console.error("Error fetching interaction state:", e);
    return { postLiked: false, commentLikesBitmap: null };
  }
};

export const followUser = async (
  program: Program<Suisuinian>,
  targetPublicKey: PublicKey
) => {
  await program.methods
    .followUser()
    .accounts({
      target: targetPublicKey,
    })
    .rpc();
};

export const unfollowUser = async (
  program: Program<Suisuinian>,
  targetPublicKey: PublicKey
) => {
  await program.methods
    .unfollowUser()
    .accounts({
      target: targetPublicKey,
    })
    .rpc();
};

export const getFollowStatus = async (
  program: Program<Suisuinian>,
  targetPublicKey: PublicKey,
  userPublicKey: PublicKey | null | undefined
): Promise<boolean> => {
  if (!userPublicKey) return false;

  const [userFollowPublicKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_follow"),
      userPublicKey.toBuffer(),
      targetPublicKey.toBuffer(),
    ],
    PROGRAM_ID
  );

  try {
    await program.account.userFollow.fetch(userFollowPublicKey);
    return true;
  } catch (e) {
    return false;
  }
};