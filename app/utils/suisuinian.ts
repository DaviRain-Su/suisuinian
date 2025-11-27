import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import IDL from "@/idl/suisuinian.json";

// Define a fallback type since we don't have the generated TS file
type Suisuinian = any;

export const PROGRAM_ID = new PublicKey(IDL.address);

export const getProgram = (connection: Connection, wallet: AnchorWallet) => {
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  return new Program<Suisuinian>(IDL as Suisuinian, PROGRAM_ID, provider);
};

export const fetchPosts = async (program: Program<Suisuinian>) => {
  const posts = await program.account.post.all();
  // Sort posts by timestamp, newest first
  posts.sort((a, b) => b.account.timestamp - a.account.timestamp);
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
      systemProgram: SystemProgram.programId,
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
        systemProgram: SystemProgram.programId,
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
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return commentPagePublicKey;
};

export const fetchCommentsForPost = async (
  program: Program<Suisuinian>,
  postPublicKey: PublicKey
) => {
  console.log("Fetching comments for post:", postPublicKey.toBase58());
  
  try {
    const postAccount = await program.account.post.fetch(postPublicKey);
    const totalComments = new BN(postAccount.commentCount).toNumber();
    const COMMENTS_PER_PAGE = 10;
    
    // Calculate how many pages we have: ceil(total / 10)
    // E.g. 0 comments -> 0 pages (loop won't run)
    // 1 comment -> 1 page
    // 10 comments -> 1 page (filled)
    // 11 comments -> 2 pages
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
        const pageAccount = await program.account.commentPage.fetch(commentPageKey);
        // Append comments with metadata
        pageAccount.comments.forEach((c: any, idx: number) => {
          // Calculate global index for this comment: (pageIndex * 10) + indexInPage
          const globalIndex = (i * COMMENTS_PER_PAGE) + idx;
          
          allComments.push({
            publicKey: new PublicKey(PublicKey.default), // Placeholder, comments don't have own Pubkeys now
            account: {
              ...c,
              globalIndex: globalIndex, // Add this helper field
              postKey: postPublicKey, // helper
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
