use anchor_lang::prelude::*;

declare_id!("Fwboky3ufxoT43egazAymFmjyAtJVDJLVJs977oLSN4V");

#[program]
pub mod backend {
    use super::*;

    pub fn create_stream(_ctx: Context<CreateStream>, _params: CreateStreamParams) -> Result<()> {
        Ok(())
    }

    pub fn withdraw(_ctx: Context<Withdraw>) -> Result<()> {
        Ok(())
    }

    pub fn cancel(_ctx: Context<CancelStream>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateStream<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: Recipient validation and ownership rules are implemented in later weeks.
    pub recipient: UncheckedAccount<'info>,
    /// CHECK: Mint validation and token-program integration are implemented in later weeks.
    pub mint: UncheckedAccount<'info>,
    #[account(mut)]
    pub stream_config: Account<'info, StreamConfig>,
    /// CHECK: Vault initialization is implemented in later weeks.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub recipient: Signer<'info>,
    #[account(mut)]
    pub stream_config: Account<'info, StreamConfig>,
    /// CHECK: Token account validation is implemented in later weeks.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: Token account validation is implemented in later weeks.
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,
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
