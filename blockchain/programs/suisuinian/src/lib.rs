use anchor_lang::prelude::*;

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
        };

        comment_page.comments.push(new_comment);

        // If this is the first comment on a new page, verify logic or linking
        // (The linking happens in `init_comment_page` usually, but here we assume 
        // the client provides the correct 'current' page to write to).
        
        // Increment global comment count
        post.comment_count = post.comment_count.checked_add(1).unwrap();

        msg!("Comment added. Total count: {}", post.comment_count);
        Ok(())
    }

    // New instruction to open a new comment page
    pub fn init_comment_page(ctx: Context<InitCommentPage>) -> Result<()> {
        let post = &mut ctx.accounts.post;
        let new_page = &mut ctx.accounts.new_page;
        
        // Link previous page if exists (optional logic, for now we just point post to new page)
        // In a strict linked list, we would need to update the `next` pointer of the old page.
        // For simplicity v1: We just update the Post to point to the NEW head (or tail).
        // Let's treat `last_comment_page` as the TAIL (where we write).
        
        if let Some(old_tail_key) = post.last_comment_page {
            // Ideally we link old_tail.next = new_page.key()
            // But that requires passing the old page as writable.
            // To save CUs/complexity, we can rely on deterministic PDA indexing:
            // Page 0, Page 1, Page 2...
        }

        new_page.post = post.key();
        new_page.page_index = post.comment_count / 10; // Simple logic: 0-9 -> Page 0, 10-19 -> Page 1
        new_page.comments = Vec::new();
        
        post.last_comment_page = Some(new_page.key());

        msg!("Initialized Comment Page #{}", new_page.page_index);
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
        // CompactComment: Author(32) + Time(8) + Parent(8) + Content(4+100) = 152
        // Total = 8 + 32 + 8 + 4 + (10 * 152) + Padding(50) = 1622
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CompactComment {
    pub author: Pubkey,
    pub timestamp: i64,
    pub parent_index: u64, // Global index of the parent comment, or u64::MAX
    pub content: String,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The content is too long.")]
    ContentTooLong,
    #[msg("The comment page is full.")]
    PageFull,
}