# Suisuinian Project Overview

## Project Type
Full-stack Decentralized Application (dApp) on Solana.

## Technologies
- **Frontend:** Next.js (React), TypeScript, Tailwind CSS.
- **Blockchain:** Solana (Anchor Framework), Rust.
- **Integration:** `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/wallet-adapter`.

## Architecture
The project implements a decentralized social feed (microblogging) where users can create posts, comment, like, and tip. To handle Solana's account size limits efficiently, it uses a **paged architecture** for comments.

### Smart Contract (Anchor)
Located in `blockchain/programs/suisuinian/src/lib.rs`.
- **Key Accounts:**
  - `Post`: Stores the main content (max 280 chars), author, and metadata.
  - `CommentPage`: Auxiliary accounts that store up to 10 comments each. PDAs derived from the `Post` address and a page index.
  - `UserLike` / `UserCommentLikes`: Track user interactions (likes for posts and comments).
- **Key Instructions:**
  - `create_post`: Initialize a new post.
  - `add_comment`: Add a comment to a specific page. Handles page initialization if needed.
  - `tip_post`: Transfer SOL to the post author.
  - `like_post`: Records a user like on a post.
  - `like_comment`: Records a user like on a comment (using a bitmap for storage efficiency).

### Frontend (Next.js)
Located in `app/`.
- **Interaction Layer:** `app/utils/suisuinian.ts` contains all blockchain interaction logic.
  - **Note:** Uses standard Anchor fetch methods with strict type safety from the generated IDL.
- **UI Components:** Standard Next.js structure (`app/page.tsx` main feed, `components/` for UI elements).

## Implemented Features (Current State)
- **Post Creation & Viewing:** Users can create posts with topics and content, and view a feed of all posts.
- **Commenting:** Users can add nested comments to posts, with a paged architecture for efficiency.
- **Post Liking:** Users can like posts, tracked via a `UserLike` PDA.
- **Post Tipping:** Users can tip post authors with SOL.
- **Comment Liking:** Users can like individual comments, tracked via a `UserCommentLikes` PDA bitmap.
- **Topic Filtering:** Posts can be filtered client-side by clicking on topic tags.
- **Enhanced UI/UX:** Integration of `react-hot-toast` for friendly notifications.

## Building and Running

### Prerequisites
- Node.js & npm/yarn
- Rust & Cargo
- Solana CLI & Anchor CLI

### Blockchain (Smart Contracts)
Navigate to the `blockchain/` directory:
```bash
cd blockchain
# Build the program
anchor build

# Run tests (Localnet)
anchor test
```

### Frontend (Client)
Navigate to the `app/` directory:
```bash
cd app
# Install dependencies
npm install

# Run development server
npm run dev
```
The app will typically run at `http://localhost:3000`.

## Development Conventions

- **Data Fetching:** When modifying `fetchCommentsForPost` in `app/utils/suisuinian.ts`, ensure the manual Borsh layouts (`COMPACT_COMMENT_LAYOUT`, `COMMENT_PAGE_LAYOUT`) match the Rust structs in `lib.rs` exactly.
- **PDA Derivation:** Most accounts are PDAs (Program Derived Addresses). Ensure seeds match exactly between client and server.
  - Comment Page Seed: `["comment_page", post_pubkey, page_index_le_bytes]`
- **Styling:** Use Tailwind CSS for all styling.
