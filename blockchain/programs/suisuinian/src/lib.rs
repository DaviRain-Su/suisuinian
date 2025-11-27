use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("F9UhuiZHK4HK3L7KJXMs5YjYoq5fmogdcgkajNTKYzCu");

#[program]
pub mod suisuinian {
    use super::*;

    pub fn create_post(ctx: Context<CreatePost>, topic: String, content: String) -> Result<()> {
        let post = &mut ctx.accounts.post;
        let clock = Clock::get()?;

        if content.len() > 280 {
            return err!(ErrorCode::ContentTooLong);
        }

        post.author = ctx.accounts.author.key();
        post.timestamp = clock.unix_timestamp;
        post.topic = topic;
        post.content = content;
        post.comment_count = 0;
        post.last_comment_page = None; // No comments yet

        msg!("Post created by: {}", post.author);
        Ok(())
    }

    pub fn add_comment(ctx: Context<AddComment>, content: String, parent_index: u64) -> Result<()> {
        let post = &mut ctx.accounts.post;
        let comment_page = &mut ctx.accounts.comment_page;
        let clock = Clock::get()?;

        if content.len() > 100 {
            return err!(ErrorCode::ContentTooLong);
        }

        // Check if the page is full (capacity 10 for this demo)
        if comment_page.comments.len() >= 10 {
             return err!(ErrorCode::PageFull);
        }

        let new_comment = CompactComment {
            author: ctx.accounts.author.key(),
            timestamp: clock.unix_timestamp,
            parent_index, // u64::MAX if no parent
            content,
            like_count: 0,
        };

        comment_page.comments.push(new_comment);

        // Increment global comment count
        post.comment_count = post.comment_count.checked_add(1).unwrap();

        msg!("Comment added. Total count: {}", post.comment_count);
        Ok(())
    }

    // New instruction to open a new comment page
    pub fn init_comment_page(ctx: Context<InitCommentPage>) -> Result<()> {
        let post = &mut ctx.accounts.post;
        let new_page = &mut ctx.accounts.new_page;
        
        if let Some(_old_tail_key) = post.last_comment_page {
            // Optional linking logic here
        }

        new_page.post = post.key();
        new_page.page_index = post.comment_count / 10; // Simple logic: 0-9 -> Page 0, 10-19 -> Page 1
        new_page.comments = Vec::new();
        
        post.last_comment_page = Some(new_page.key());

        msg!("Initialized Comment Page #{}", new_page.page_index);
        Ok(())
    }

    pub fn tip_post(ctx: Context<TipPost>, amount_lamports: u64) -> Result<()> {
        let ix = system_program::Transfer {
            from: ctx.accounts.payer.to_account_info(),
            to: ctx.accounts.author.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                ix
            ),
            amount_lamports,
        )?;
        msg!("Tipped {} lamports to post author", amount_lamports);
        Ok(())
    }

    pub fn like_post(ctx: Context<LikePost>) -> Result<()> {
        let user_like = &mut ctx.accounts.user_like;
        user_like.user = ctx.accounts.user.key();
        user_like.post = ctx.accounts.post.key();
        // We don't strictly need a counter on Post for this MVP unless required, 
        // but the existence of UserLike PDA confirms the like.
        msg!("Post liked by {}", ctx.accounts.user.key());
        Ok(())
    }

    pub fn like_comment(ctx: Context<LikeComment>, comment_global_index: u64) -> Result<()> {
        let comment_page = &mut ctx.accounts.comment_page;
        let user_comment_likes = &mut ctx.accounts.user_comment_likes;

        // 1. Update the bitmask in UserCommentLikes
        // We map global index to the bitmask. 
        // NOTE: This bitmask is per-post. 128 bytes = 1024 bits.
        // This supports up to 1024 comments per post for liking tracking for a single user.
        // If comments > 1024, this simple bitmap approach fails for user tracking.
        // For this prototype, we assume < 1024 comments or we just wrap/ignore (which is buggy but acceptable for MVP).
        
        let byte_index = (comment_global_index / 8) as usize;
        let bit_offset = (comment_global_index % 8) as u8;

        if byte_index >= user_comment_likes.likes_bitmap.len() {
            return err!(ErrorCode::CommentIndexOutOfBounds);
        }

        // Check if already liked
        let is_liked = (user_comment_likes.likes_bitmap[byte_index] >> bit_offset) & 1;
        if is_liked == 1 {
            return err!(ErrorCode::AlreadyLiked);
        }

        // Set bit
        user_comment_likes.likes_bitmap[byte_index] |= 1 << bit_offset;

        // 2. Update the count on the comment itself
        // Find the comment in the current page.
        // The comment_page passed in MUST match the comment_global_index.
        // Index in page = global % 10
        let local_index = (comment_global_index % 10) as usize;
        
        if local_index >= comment_page.comments.len() {
             return err!(ErrorCode::CommentNotFound);
        }

        let comment = &mut comment_page.comments[local_index];
        comment.like_count = comment.like_count.checked_add(1).unwrap();

        msg!("Comment {} liked", comment_global_index);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(topic: String, content: String)]
pub struct CreatePost<'info> {
    #[account(init, payer = author, space = 8 + 32 + 8 + 50 + 4 + 280 + 8 + (1 + 32) + 50)] 
    pub post: Account<'info, Post>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitCommentPage<'info> {
    #[account(mut)]
    pub post: Account<'info, Post>,

    #[account(
        init,
        payer = author,
        // Space: Disc(8) + PostKey(32) + Index(8) + VecPrefix(4) + 10 * CompactCommentSize
        // CompactComment: Author(32) + Time(8) + Parent(8) + Content(4+100) + LikeCount(4) = 156
        // Total = 8 + 32 + 8 + 4 + (10 * 156) + Padding(50) = 1662
        space = 1700, 
        seeds = [b"comment_page", post.key().as_ref(), &(post.comment_count / 10).to_le_bytes()],
        bump
    )]
    pub new_page: Account<'info, CommentPage>,

    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddComment<'info> {
    #[account(mut)]
    pub post: Account<'info, Post>,

    #[account(
        mut,
        seeds = [b"comment_page", post.key().as_ref(), &(post.comment_count / 10).to_le_bytes()],
        bump
    )]
    pub comment_page: Account<'info, CommentPage>,

    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TipPost<'info> {
    #[account(mut)]
    pub post: Account<'info, Post>,
    /// CHECK: We just transfer to this account, no data read needed (verification done via post.author if needed, but here we trust client passes correct author or we check against post)
    #[account(mut, address = post.author)] 
    pub author: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LikePost<'info> {
    pub post: Account<'info, Post>,
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32, // Disc + User + Post
        seeds = [b"user_like", user.key().as_ref(), post.key().as_ref()],
        bump
    )]
    pub user_like: Account<'info, UserLike>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(comment_global_index: u64)]
pub struct LikeComment<'info> {
    pub post: Account<'info, Post>,
    
    #[account(
        mut,
        seeds = [b"comment_page", post.key().as_ref(), &(comment_global_index / 10).to_le_bytes()],
        bump
    )]
    pub comment_page: Account<'info, CommentPage>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 32 + 128, // Disc + User + Post + Bitmap(128)
        seeds = [b"user_comment_likes", user.key().as_ref(), post.key().as_ref()],
        bump
    )]
    pub user_comment_likes: Account<'info, UserCommentLikes>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[account]
pub struct Post {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
    pub comment_count: u64,
    pub last_comment_page: Option<Pubkey>, // Track the current tail for writing
}

#[account]
pub struct CommentPage {
    pub post: Pubkey,
    pub page_index: u64,
    pub comments: Vec<CompactComment>,
}

#[account]
pub struct UserLike {
    pub user: Pubkey,
    pub post: Pubkey,
}

#[account]
pub struct UserCommentLikes {
    pub user: Pubkey,
    pub post: Pubkey,
    pub likes_bitmap: [u8; 128], 
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CompactComment {
    pub author: Pubkey,
    pub timestamp: i64,
    pub parent_index: u64, 
    pub content: String,
    pub like_count: u32,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The content is too long.")]
    ContentTooLong,
    #[msg("The comment page is full.")]
    PageFull,
    #[msg("Comment index out of bounds for tracking.")]
    CommentIndexOutOfBounds,
    #[msg("Already liked this comment.")]
    AlreadyLiked,
    #[msg("Comment not found in page.")]
    CommentNotFound,
}
