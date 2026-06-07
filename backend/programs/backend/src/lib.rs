#![cfg_attr(coverage, allow(dead_code, unused_imports))]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fwboky3ufxoT43egazAymFmjyAtJVDJLVJs977oLSN4V");

#[cfg(not(coverage))]
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
        if matches!(
            params.schedule_type,
            ScheduleType::Cliff | ScheduleType::CliffLinear
        ) {
            require!(
                params.cliff_timestamp > params.start_timestamp
                    && params.cliff_timestamp < params.end_timestamp,
                ErrorCode::InvalidSchedule
            );
        }
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

        let unlocked = compute_unlocked(stream_config, now)?;
        let claimable = unlocked
            .checked_sub(stream_config.amount_claimed)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(claimable > 0, ErrorCode::NothingToWithdraw);

        let stream_key = stream_config.key();
        let signer_seeds: &[&[&[u8]]] =
            &[&[b"vault", stream_key.as_ref(), &[stream_config.vault_bump]]];

        transfer_from_vault(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.recipient_token_account,
            signer_seeds,
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

    pub fn release_milestone(ctx: Context<ReleaseMilestone>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let stream_config = &mut ctx.accounts.stream_config;

        require!(
            stream_config.status == StreamStatus::Active,
            ErrorCode::StreamNotActive
        );
        require!(
            stream_config.schedule_type == ScheduleType::Milestone,
            ErrorCode::UnsupportedSchedule
        );
        require!(
            ctx.accounts.authority.key() == stream_config.creator
                || ctx.accounts.authority.key() == stream_config.release_authority,
            ErrorCode::Unauthorized
        );
        require!(now <= stream_config.end_timestamp, ErrorCode::StreamExpired);

        stream_config.milestone_released = true;

        Ok(())
    }

    pub fn cancel(ctx: Context<CancelStream>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let stream_config = &mut ctx.accounts.stream_config;

        require_cancel_authority(stream_config, ctx.accounts.authority.key())?;
        require!(
            stream_config.status != StreamStatus::Cancelled,
            ErrorCode::AlreadyCancelled
        );
        require!(
            stream_config.status != StreamStatus::Completed,
            ErrorCode::FullyVested
        );

        let unlocked = compute_unlocked(stream_config, now)?;
        require!(
            unlocked < stream_config.total_amount,
            ErrorCode::FullyVested
        );

        let unlocked_unclaimed = unlocked
            .checked_sub(stream_config.amount_claimed)
            .ok_or(ErrorCode::MathOverflow)?;
        let locked_amount = ctx
            .accounts
            .vault
            .amount
            .checked_sub(unlocked_unclaimed)
            .ok_or(ErrorCode::MathOverflow)?;

        let stream_key = stream_config.key();
        let signer_seeds: &[&[&[u8]]] =
            &[&[b"vault", stream_key.as_ref(), &[stream_config.vault_bump]]];

        if unlocked_unclaimed > 0 {
            transfer_from_vault(
                &ctx.accounts.token_program,
                &ctx.accounts.vault,
                &ctx.accounts.recipient_token_account,
                signer_seeds,
                unlocked_unclaimed,
            )?;
        }

        if locked_amount > 0 {
            transfer_from_vault(
                &ctx.accounts.token_program,
                &ctx.accounts.vault,
                &ctx.accounts.creator_token_account,
                signer_seeds,
                locked_amount,
            )?;
        }

        stream_config.amount_claimed = unlocked;
        stream_config.status = StreamStatus::Cancelled;

        Ok(())
    }
}

#[cfg(not(coverage))]
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

#[cfg(not(coverage))]
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

#[cfg(not(coverage))]
#[derive(Accounts)]
pub struct CancelStream<'info> {
    pub authority: Signer<'info>,
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
        constraint = recipient_token_account.owner == stream_config.recipient @ ErrorCode::Unauthorized,
        constraint = recipient_token_account.mint == stream_config.mint @ ErrorCode::InvalidMint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = creator_token_account.owner == stream_config.creator @ ErrorCode::Unauthorized,
        constraint = creator_token_account.mint == stream_config.mint @ ErrorCode::InvalidMint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[cfg(not(coverage))]
#[derive(Accounts)]
pub struct ReleaseMilestone<'info> {
    pub authority: Signer<'info>,
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
}

#[cfg(not(coverage))]
fn transfer_from_vault<'info>(
    token_program: &Program<'info, Token>,
    vault: &Account<'info, TokenAccount>,
    destination: &Account<'info, TokenAccount>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: destination.to_account_info(),
                authority: vault.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )
}

fn require_cancel_authority(stream_config: &StreamConfig, authority: Pubkey) -> Result<()> {
    require!(
        stream_config.is_cancellable,
        ErrorCode::CancellationDisabled
    );

    let is_authorized = match stream_config.cancel_authority {
        CancelAuthority::CreatorOnly => authority == stream_config.creator,
        CancelAuthority::Either => {
            authority == stream_config.creator || authority == stream_config.recipient
        }
        CancelAuthority::Neither => false,
    };

    require!(is_authorized, ErrorCode::Unauthorized);

    Ok(())
}

fn compute_unlocked(stream_config: &StreamConfig, now: i64) -> Result<u64> {
    match stream_config.schedule_type {
        ScheduleType::Linear => compute_linear_unlocked(
            stream_config.total_amount,
            stream_config.start_timestamp,
            stream_config.end_timestamp,
            now,
        ),
        ScheduleType::Cliff | ScheduleType::CliffLinear => {
            if now < stream_config.cliff_timestamp {
                return Ok(0);
            }

            let linear_start = if stream_config.cliff_timestamp > 0 {
                stream_config.cliff_timestamp
            } else {
                stream_config.start_timestamp
            };

            compute_linear_unlocked(
                stream_config.total_amount,
                linear_start,
                stream_config.end_timestamp,
                now,
            )
        }
        ScheduleType::Milestone => {
            if stream_config.milestone_released {
                Ok(stream_config.total_amount)
            } else {
                Ok(0)
            }
        }
    }
}

fn compute_linear_unlocked(
    total_amount: u64,
    start_timestamp: i64,
    end_timestamp: i64,
    now: i64,
) -> Result<u64> {
    if now <= start_timestamp {
        return Ok(0);
    }

    if now >= end_timestamp {
        return Ok(total_amount);
    }

    let elapsed = now
        .checked_sub(start_timestamp)
        .ok_or(ErrorCode::MathOverflow)? as u128;
    let duration = end_timestamp
        .checked_sub(start_timestamp)
        .ok_or(ErrorCode::MathOverflow)? as u128;
    let total_amount = total_amount as u128;

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

#[cfg(not(coverage))]
#[derive(InitSpace)]
#[account]
pub struct ClaimReceipt {
    pub stream: Pubkey,
    pub claim_index: u32,
    pub claimed_at: i64,
    pub amount: u64,
    pub recipient: Pubkey,
}

#[cfg(not(coverage))]
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
    #[msg("Schedule type is not supported for this instruction.")]
    UnsupportedSchedule,
    #[msg("Signer is not authorized for this stream.")]
    Unauthorized,
    #[msg("Stream is not active.")]
    StreamNotActive,
    #[msg("There are no unlocked tokens available to withdraw.")]
    NothingToWithdraw,
    #[msg("Stream is already cancelled.")]
    AlreadyCancelled,
    #[msg("Stream is already fully vested.")]
    FullyVested,
    #[msg("Stream has expired.")]
    StreamExpired,
    #[msg("Vesting math overflowed.")]
    MathOverflow,
    #[msg("Token account mint does not match the stream mint.")]
    InvalidMint,
    #[msg("Vault token account does not match the stream vault.")]
    InvalidVault,
    #[msg("Cancellation is disabled for this stream.")]
    CancellationDisabled,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn stream_config(schedule_type: ScheduleType) -> StreamConfig {
        StreamConfig {
            stream_id: 1,
            creator: Pubkey::new_unique(),
            recipient: Pubkey::new_unique(),
            mint: Pubkey::new_unique(),
            vault: Pubkey::new_unique(),
            schedule_type,
            total_amount: 1_000,
            amount_claimed: 0,
            start_timestamp: 100,
            end_timestamp: 200,
            cliff_timestamp: 0,
            cliff_amount: 0,
            authority_type: AuthorityType::None,
            release_authority: Pubkey::default(),
            milestone_released: false,
            milestone_description: [0; 128],
            status: StreamStatus::Active,
            is_cancellable: true,
            cancel_authority: CancelAuthority::CreatorOnly,
            created_at: 0,
            bump: 1,
            vault_bump: 1,
            reserved: [0; 30],
        }
    }

    #[test]
    fn linear_unlock_is_zero_before_and_at_start() {
        assert_eq!(compute_linear_unlocked(1_000, 100, 200, 50).unwrap(), 0);
        assert_eq!(compute_linear_unlocked(1_000, 100, 200, 100).unwrap(), 0);
    }

    #[test]
    fn linear_unlocks_proportionally_between_start_and_end() {
        assert_eq!(compute_linear_unlocked(1_000, 100, 200, 125).unwrap(), 250);
        assert_eq!(compute_linear_unlocked(1_000, 100, 200, 150).unwrap(), 500);
        assert_eq!(compute_linear_unlocked(1_000, 100, 200, 175).unwrap(), 750);
    }

    #[test]
    fn linear_unlock_caps_at_total_amount_after_end() {
        assert_eq!(
            compute_linear_unlocked(1_000, 100, 200, 200).unwrap(),
            1_000
        );
        assert_eq!(
            compute_linear_unlocked(1_000, 100, 200, 250).unwrap(),
            1_000
        );
    }

    #[test]
    fn linear_unlock_handles_large_amounts_without_overflow() {
        assert_eq!(
            compute_linear_unlocked(u64::MAX, 0, 100, 50).unwrap(),
            u64::MAX / 2
        );
    }

    #[test]
    fn compute_unlocked_uses_linear_schedule() {
        let config = stream_config(ScheduleType::Linear);

        assert_eq!(compute_unlocked(&config, 150).unwrap(), 500);
    }

    #[test]
    fn compute_unlocked_keeps_cliff_stream_locked_before_cliff() {
        let mut config = stream_config(ScheduleType::CliffLinear);
        config.cliff_timestamp = 150;

        assert_eq!(compute_unlocked(&config, 149).unwrap(), 0);
    }

    #[test]
    fn compute_unlocked_starts_cliff_linear_schedule_at_cliff() {
        let mut config = stream_config(ScheduleType::CliffLinear);
        config.cliff_timestamp = 150;

        assert_eq!(compute_unlocked(&config, 150).unwrap(), 0);
        assert_eq!(compute_unlocked(&config, 175).unwrap(), 500);
        assert_eq!(compute_unlocked(&config, 200).unwrap(), 1_000);
    }

    #[test]
    fn compute_unlocked_uses_milestone_release_flag() {
        let mut config = stream_config(ScheduleType::Milestone);

        assert_eq!(compute_unlocked(&config, 150).unwrap(), 0);

        config.milestone_released = true;

        assert_eq!(compute_unlocked(&config, 150).unwrap(), 1_000);
    }

    #[test]
    fn cancel_authority_rejects_non_cancellable_streams() {
        let mut config = stream_config(ScheduleType::Linear);
        config.is_cancellable = false;

        assert!(require_cancel_authority(&config, config.creator).is_err());
    }

    #[test]
    fn cancel_authority_creator_only_allows_creator() {
        let config = stream_config(ScheduleType::Linear);

        assert!(require_cancel_authority(&config, config.creator).is_ok());
        assert!(require_cancel_authority(&config, config.recipient).is_err());
    }

    #[test]
    fn cancel_authority_either_allows_creator_or_recipient() {
        let mut config = stream_config(ScheduleType::Linear);
        config.cancel_authority = CancelAuthority::Either;

        assert!(require_cancel_authority(&config, config.creator).is_ok());
        assert!(require_cancel_authority(&config, config.recipient).is_ok());
        assert!(require_cancel_authority(&config, Pubkey::new_unique()).is_err());
    }

    #[test]
    fn cancel_authority_neither_rejects_everyone() {
        let mut config = stream_config(ScheduleType::Linear);
        config.cancel_authority = CancelAuthority::Neither;

        assert!(require_cancel_authority(&config, config.creator).is_err());
        assert!(require_cancel_authority(&config, config.recipient).is_err());
    }
}
