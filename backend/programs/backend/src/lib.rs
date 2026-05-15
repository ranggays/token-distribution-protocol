use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fwboky3ufxoT43egazAymFmjyAtJVDJLVJs977oLSN4V");

#[program]
pub mod backend {
    use super::*;

    pub fn create_stream(ctx: Context<CreateStream>, params: CreateStreamParams) -> Result<()> {
        require!(params.total_amount > 0, ErrorCode::ZeroAmount);
        require!(
            params.end_timestamp > params.start_timestamp,
            ErrorCode::InvalidSchedule
        );
        require!(
            ctx.accounts.recipient.key() != ctx.accounts.creator.key(),
            ErrorCode::SameRecipientCreator
        );
        require!(
            params.schedule_type == ScheduleType::Linear,
            ErrorCode::UnsupportedSchedule
        );

        let now = Clock::get()?.unix_timestamp;
        let stream_config = &mut ctx.accounts.stream_config;

        stream_config.stream_id = params.stream_id;
        stream_config.creator = ctx.accounts.creator.key();
        stream_config.recipient = ctx.accounts.recipient.key();
        stream_config.mint = ctx.accounts.mint.key();
        stream_config.vault = ctx.accounts.vault.key();
        stream_config.schedule_type = params.schedule_type;
        stream_config.total_amount = params.total_amount;
        stream_config.amount_claimed = 0;
        stream_config.start_timestamp = params.start_timestamp;
        stream_config.end_timestamp = params.end_timestamp;
        stream_config.cliff_timestamp = params.cliff_timestamp;
        stream_config.cliff_amount = params.cliff_amount;
        stream_config.authority_type = params.authority_type;
        stream_config.release_authority = params.release_authority.unwrap_or_default();
        stream_config.milestone_released = false;
        stream_config.milestone_description = params.milestone_description;
        stream_config.status = StreamStatus::Active;
        stream_config.is_cancellable = params.is_cancellable;
        stream_config.cancel_authority = params.cancel_authority;
        stream_config.created_at = now;
        stream_config.bump = ctx.bumps.stream_config;
        stream_config.vault_bump = ctx.bumps.vault;
        stream_config.reserved = [0; 30];

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            params.total_amount,
        )?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let stream_config = &mut ctx.accounts.stream_config;

        require!(
            ctx.accounts.recipient.key() == stream_config.recipient,
            ErrorCode::Unauthorized
        );
        require!(
            stream_config.status == StreamStatus::Active,
            ErrorCode::StreamNotActive
        );

        let unlocked = compute_linear_unlocked(stream_config, now)?;
        let claimable = unlocked
            .checked_sub(stream_config.amount_claimed)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(claimable > 0, ErrorCode::NothingToClaim);

        let stream_key = stream_config.key();
        let signer_seeds: &[&[&[u8]]] =
            &[&[b"vault", stream_key.as_ref(), &[stream_config.vault_bump]]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            ),
            claimable,
        )?;

        stream_config.amount_claimed = stream_config
            .amount_claimed
            .checked_add(claimable)
            .ok_or(ErrorCode::MathOverflow)?;

        if stream_config.amount_claimed == stream_config.total_amount {
            stream_config.status = StreamStatus::Completed;
        }

        Ok(())
    }

    pub fn cancel(_ctx: Context<CancelStream>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(params: CreateStreamParams)]
pub struct CreateStream<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: The recipient only needs to be a public key at stream creation.
    pub recipient: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        space = StreamConfig::SPACE,
        seeds = [
            b"stream",
            creator.key().as_ref(),
            recipient.key().as_ref(),
            &params.stream_id.to_le_bytes()
        ],
        bump
    )]
    pub stream_config: Account<'info, StreamConfig>,
    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = vault,
        seeds = [b"vault", stream_config.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key() @ ErrorCode::Unauthorized,
        constraint = creator_token_account.mint == mint.key() @ ErrorCode::InvalidMint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub recipient: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"stream",
            stream_config.creator.as_ref(),
            stream_config.recipient.as_ref(),
            &stream_config.stream_id.to_le_bytes()
        ],
        bump = stream_config.bump
    )]
    pub stream_config: Account<'info, StreamConfig>,
    #[account(
        mut,
        seeds = [b"vault", stream_config.key().as_ref()],
        bump = stream_config.vault_bump,
        constraint = vault.key() == stream_config.vault @ ErrorCode::InvalidVault,
        constraint = vault.mint == stream_config.mint @ ErrorCode::InvalidMint
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = recipient_token_account.owner == recipient.key() @ ErrorCode::Unauthorized,
        constraint = recipient_token_account.mint == stream_config.mint @ ErrorCode::InvalidMint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelStream<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub stream_config: Account<'info, StreamConfig>,
    /// CHECK: Token account validation is implemented in later weeks.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
}

fn compute_linear_unlocked(stream_config: &StreamConfig, now: i64) -> Result<u64> {
    if now <= stream_config.start_timestamp {
        return Ok(0);
    }

    if now >= stream_config.end_timestamp {
        return Ok(stream_config.total_amount);
    }

    let elapsed = now
        .checked_sub(stream_config.start_timestamp)
        .ok_or(ErrorCode::MathOverflow)? as u128;
    let duration = stream_config
        .end_timestamp
        .checked_sub(stream_config.start_timestamp)
        .ok_or(ErrorCode::MathOverflow)? as u128;
    let total_amount = stream_config.total_amount as u128;

    let unlocked = total_amount
        .checked_mul(elapsed)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(duration)
        .ok_or(ErrorCode::MathOverflow)?;

    u64::try_from(unlocked).map_err(|_| ErrorCode::MathOverflow.into())
}

#[derive(InitSpace)]
#[account]
pub struct StreamConfig {
    pub stream_id: u64,
    pub creator: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub schedule_type: ScheduleType,
    pub total_amount: u64,
    pub amount_claimed: u64,
    pub start_timestamp: i64,
    pub end_timestamp: i64,
    pub cliff_timestamp: i64,
    pub cliff_amount: u64,
    pub authority_type: AuthorityType,
    pub release_authority: Pubkey,
    pub milestone_released: bool,
    pub milestone_description: [u8; 128],
    pub status: StreamStatus,
    pub is_cancellable: bool,
    pub cancel_authority: CancelAuthority,
    pub created_at: i64,
    pub bump: u8,
    pub vault_bump: u8,
    pub reserved: [u8; 30],
}

impl StreamConfig {
    pub const SPACE: usize = 8 + StreamConfig::INIT_SPACE;
}

#[derive(InitSpace)]
#[account]
pub struct ClaimReceipt {
    pub stream: Pubkey,
    pub claim_index: u32,
    pub claimed_at: i64,
    pub amount: u64,
    pub recipient: Pubkey,
}

impl ClaimReceipt {
    pub const SPACE: usize = 8 + ClaimReceipt::INIT_SPACE;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ScheduleType {
    Linear,
    Cliff,
    CliffLinear,
    Milestone,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AuthorityType {
    None,
    SingleKey,
    MultiSig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum StreamStatus {
    Active,
    Cancelled,
    Completed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CancelAuthority {
    CreatorOnly,
    Either,
    Neither,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct CreateStreamParams {
    pub stream_id: u64,
    pub total_amount: u64,
    pub start_timestamp: i64,
    pub end_timestamp: i64,
    pub cliff_timestamp: i64,
    pub cliff_amount: u64,
    pub schedule_type: ScheduleType,
    pub authority_type: AuthorityType,
    pub release_authority: Option<Pubkey>,
    pub milestone_description: [u8; 128],
    pub is_cancellable: bool,
    pub cancel_authority: CancelAuthority,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Stream total amount must be greater than zero.")]
    ZeroAmount,
    #[msg("Stream end timestamp must be greater than start timestamp.")]
    InvalidSchedule,
    #[msg("Stream recipient and creator cannot be the same wallet.")]
    SameRecipientCreator,
    #[msg("Only linear streams are supported in Week 4.")]
    UnsupportedSchedule,
    #[msg("Signer is not authorized for this stream.")]
    Unauthorized,
    #[msg("Stream is not active.")]
    StreamNotActive,
    #[msg("There are no unlocked tokens available to claim.")]
    NothingToClaim,
    #[msg("Vesting math overflowed.")]
    MathOverflow,
    #[msg("Token account mint does not match the stream mint.")]
    InvalidMint,
    #[msg("Vault token account does not match the stream vault.")]
    InvalidVault,
}
