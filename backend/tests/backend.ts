import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createAccount,
  createMint,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";
import { Backend } from "../target/types/backend";

describe("backend", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.backend as Program<Backend>;
  const payer = (provider.wallet as anchor.Wallet).payer;
  const connection = provider.connection;

  const linear = { linear: {} };
  const cliffLinear = { cliffLinear: {} };
  const milestone = { milestone: {} };
  const authorityNone = { none: {} };
  const creatorOnly = { creatorOnly: {} };
  const either = { either: {} };
  const neither = { neither: {} };

  async function airdrop(pubkey: anchor.web3.PublicKey) {
    const signature = await connection.requestAirdrop(
      pubkey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      "confirmed"
    );
  }

  async function nowSeconds() {
    const slot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(slot);
    return blockTime ?? Math.floor(Date.now() / 1000);
  }

  async function sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  function streamSeeds(
    creator: anchor.web3.PublicKey,
    recipient: anchor.web3.PublicKey,
    streamId: anchor.BN
  ) {
    return [
      Buffer.from("stream"),
      creator.toBuffer(),
      recipient.toBuffer(),
      streamId.toArrayLike(Buffer, "le", 8),
    ];
  }

  function deriveStream(
    creator: anchor.web3.PublicKey,
    recipient: anchor.web3.PublicKey,
    streamId: anchor.BN
  ) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      streamSeeds(creator, recipient, streamId),
      program.programId
    )[0];
  }

  function deriveVault(streamConfig: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), streamConfig.toBuffer()],
      program.programId
    )[0];
  }

  async function createTokenFixture(totalAmount = 1_000) {
    const creator = anchor.web3.Keypair.generate();
    const recipient = anchor.web3.Keypair.generate();

    await airdrop(creator.publicKey);
    await airdrop(recipient.publicKey);

    const mint = await createMint(connection, payer, payer.publicKey, null, 0);
    const creatorTokenAccount = await createAccount(
      connection,
      payer,
      mint,
      creator.publicKey
    );
    const recipientTokenAccount = await createAccount(
      connection,
      payer,
      mint,
      recipient.publicKey
    );

    await mintTo(
      connection,
      payer,
      mint,
      creatorTokenAccount,
      payer,
      totalAmount
    );

    return {
      creator,
      recipient,
      mint,
      creatorTokenAccount,
      recipientTokenAccount,
    };
  }

  async function createStream({
    creator,
    recipient,
    mint,
    creatorTokenAccount,
    streamId,
    totalAmount,
    startTimestamp,
    endTimestamp,
    cliffTimestamp = 0,
    cliffAmount = 0,
    scheduleType = linear,
    releaseAuthority = null,
    isCancellable = false,
    cancelAuthority = creatorOnly,
  }: {
    creator: anchor.web3.Keypair;
    recipient: anchor.web3.Keypair;
    mint: anchor.web3.PublicKey;
    creatorTokenAccount: anchor.web3.PublicKey;
    streamId: anchor.BN;
    totalAmount: number;
    startTimestamp: number;
    endTimestamp: number;
    cliffTimestamp?: number;
    cliffAmount?: number;
    scheduleType?: Record<string, unknown>;
    releaseAuthority?: anchor.web3.PublicKey | null;
    isCancellable?: boolean;
    cancelAuthority?: Record<string, unknown>;
  }) {
    const streamConfig = deriveStream(
      creator.publicKey,
      recipient.publicKey,
      streamId
    );
    const vault = deriveVault(streamConfig);

    await program.methods
      .createStream({
        streamId,
        totalAmount: new anchor.BN(totalAmount),
        startTimestamp: new anchor.BN(startTimestamp),
        endTimestamp: new anchor.BN(endTimestamp),
        cliffTimestamp: new anchor.BN(cliffTimestamp),
        cliffAmount: new anchor.BN(cliffAmount),
        scheduleType,
        authorityType: authorityNone,
        releaseAuthority,
        milestoneDescription: Array(128).fill(0),
        isCancellable,
        cancelAuthority,
      } as any)
      .accounts({
        creator: creator.publicKey,
        recipient: recipient.publicKey,
        mint,
        streamConfig,
        vault,
        creatorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([creator])
      .rpc();

    return { streamConfig, vault };
  }

  async function releaseMilestone({
    authority,
    streamConfig,
  }: {
    authority: anchor.web3.Keypair;
    streamConfig: anchor.web3.PublicKey;
  }) {
    await program.methods
      .releaseMilestone()
      .accounts({
        authority: authority.publicKey,
        streamConfig,
      } as any)
      .signers([authority])
      .rpc();
  }

  async function cancelStream({
    authority,
    streamConfig,
    vault,
    recipientTokenAccount,
    creatorTokenAccount,
  }: {
    authority: anchor.web3.Keypair;
    streamConfig: anchor.web3.PublicKey;
    vault: anchor.web3.PublicKey;
    recipientTokenAccount: anchor.web3.PublicKey;
    creatorTokenAccount: anchor.web3.PublicKey;
  }) {
    await program.methods
      .cancel()
      .accounts({
        authority: authority.publicKey,
        streamConfig,
        vault,
        recipientTokenAccount,
        creatorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .signers([authority])
      .rpc();
  }

  async function withdraw({
    recipient,
    streamConfig,
    vault,
    recipientTokenAccount,
  }: {
    recipient: anchor.web3.Keypair;
    streamConfig: anchor.web3.PublicKey;
    vault: anchor.web3.PublicKey;
    recipientTokenAccount: anchor.web3.PublicKey;
  }) {
    await program.methods
      .withdraw()
      .accounts({
        recipient: recipient.publicKey,
        streamConfig,
        vault,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .signers([recipient])
      .rpc();
  }

  it("creates a stream and locks tokens in the PDA vault", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const streamId = new anchor.BN(1);

    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId,
      totalAmount: 1_000,
      startTimestamp: currentTime,
      endTimestamp: currentTime + 1_000,
    });

    const vaultAccount = await getAccount(connection, vault);
    const creatorAccount = await getAccount(
      connection,
      fixture.creatorTokenAccount
    );
    const streamAccount = await program.account.streamConfig.fetch(
      streamConfig
    );

    expect(Number(vaultAccount.amount)).to.equal(1_000);
    expect(Number(creatorAccount.amount)).to.equal(0);
    expect(streamAccount.creator.toBase58()).to.equal(
      fixture.creator.publicKey.toBase58()
    );
    expect(streamAccount.recipient.toBase58()).to.equal(
      fixture.recipient.publicKey.toBase58()
    );
    expect(streamAccount.amountClaimed.toNumber()).to.equal(0);
  });

  it("rejects withdrawal when 0% is unlocked", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(2),
      totalAmount: 1_000,
      startTimestamp: currentTime + 60,
      endTimestamp: currentTime + 1_060,
    });

    try {
      await withdraw({
        recipient: fixture.recipient,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
      });
      expect.fail("withdraw should fail before any tokens unlock");
    } catch (error) {
      expect((error as Error).toString()).to.contain("NothingToWithdraw");
    }
  });

  it("keeps cliff streams locked before the cliff timestamp", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(9),
      totalAmount: 1_000,
      startTimestamp: currentTime,
      cliffTimestamp: currentTime + 60,
      endTimestamp: currentTime + 1_060,
      scheduleType: cliffLinear,
    });

    try {
      await withdraw({
        recipient: fixture.recipient,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
      });
      expect.fail("withdraw should fail before the cliff");
    } catch (error) {
      expect((error as Error).toString()).to.contain("NothingToWithdraw");
    }
  });

  it("unlocks cliff streams linearly after the cliff timestamp", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(10),
      totalAmount: 1_000,
      startTimestamp: currentTime - 1_000,
      cliffTimestamp: currentTime - 500,
      endTimestamp: currentTime + 500,
      scheduleType: cliffLinear,
    });

    await withdraw({
      recipient: fixture.recipient,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
    });

    const recipientAccount = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    const claimed = Number(recipientAccount.amount);
    expect(claimed).to.be.greaterThanOrEqual(495);
    expect(claimed).to.be.lessThanOrEqual(510);
  });

  it("withdraws roughly 25% of a linear stream", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(3),
      totalAmount: 1_000,
      startTimestamp: currentTime - 250,
      endTimestamp: currentTime + 750,
    });

    await withdraw({
      recipient: fixture.recipient,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
    });

    const recipientAccount = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    const claimed = Number(recipientAccount.amount);
    expect(claimed).to.be.greaterThanOrEqual(245);
    expect(claimed).to.be.lessThanOrEqual(260);
  });

  it("withdraws roughly 50% of a linear stream", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(4),
      totalAmount: 1_000,
      startTimestamp: currentTime - 500,
      endTimestamp: currentTime + 500,
    });

    await withdraw({
      recipient: fixture.recipient,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
    });

    const recipientAccount = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    const claimed = Number(recipientAccount.amount);
    expect(claimed).to.be.greaterThanOrEqual(495);
    expect(claimed).to.be.lessThanOrEqual(510);
  });

  it("withdraws 100% and marks the stream completed", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(5),
      totalAmount: 1_000,
      startTimestamp: currentTime - 1_000,
      endTimestamp: currentTime - 1,
    });

    await withdraw({
      recipient: fixture.recipient,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
    });

    const recipientAccount = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    const vaultAccount = await getAccount(connection, vault);
    const streamAccount = await program.account.streamConfig.fetch(
      streamConfig
    );

    expect(Number(recipientAccount.amount)).to.equal(1_000);
    expect(Number(vaultAccount.amount)).to.equal(0);
    expect(streamAccount.amountClaimed.toNumber()).to.equal(1_000);
    expect(streamAccount.status).to.deep.equal({ completed: {} });
  });

  it("supports partial withdrawals over time", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(6),
      totalAmount: 1_000,
      startTimestamp: currentTime - 5,
      endTimestamp: currentTime + 5,
    });

    await withdraw({
      recipient: fixture.recipient,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
    });

    const afterFirstClaim = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    expect(Number(afterFirstClaim.amount)).to.be.lessThan(1_000);

    const streamAccount = await program.account.streamConfig.fetch(
      streamConfig
    );
    expect(streamAccount.amountClaimed.toNumber()).to.be.greaterThan(0);

    await sleep(7_000);
    await withdraw({
      recipient: fixture.recipient,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
    });

    const afterSecondClaim = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    expect(Number(afterSecondClaim.amount)).to.be.greaterThan(
      Number(afterFirstClaim.amount)
    );
    expect(Number(afterSecondClaim.amount)).to.equal(1_000);
  });

  it("rejects unauthorized withdrawals", async () => {
    const fixture = await createTokenFixture();
    const attacker = anchor.web3.Keypair.generate();
    await airdrop(attacker.publicKey);

    const attackerTokenAccount = await createAccount(
      connection,
      payer,
      fixture.mint,
      attacker.publicKey
    );
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(8),
      totalAmount: 1_000,
      startTimestamp: currentTime - 1_000,
      endTimestamp: currentTime - 1,
    });

    try {
      await withdraw({
        recipient: attacker,
        streamConfig,
        vault,
        recipientTokenAccount: attackerTokenAccount,
      });
      expect.fail("withdraw should reject non-recipient signer");
    } catch (error) {
      expect((error as Error).toString()).to.contain("Unauthorized");
    }
  });

  it("unlocks milestone streams only after the creator releases the milestone", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(11),
      totalAmount: 1_000,
      startTimestamp: currentTime,
      endTimestamp: currentTime + 1_000,
      scheduleType: milestone,
      releaseAuthority: fixture.creator.publicKey,
    });

    try {
      await withdraw({
        recipient: fixture.recipient,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
      });
      expect.fail("withdraw should fail before milestone release");
    } catch (error) {
      expect((error as Error).toString()).to.contain("NothingToWithdraw");
    }

    await releaseMilestone({
      authority: fixture.creator,
      streamConfig,
    });

    await withdraw({
      recipient: fixture.recipient,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
    });

    const recipientAccount = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    const vaultAccount = await getAccount(connection, vault);
    const streamAccount = await program.account.streamConfig.fetch(
      streamConfig
    );

    expect(Number(recipientAccount.amount)).to.equal(1_000);
    expect(Number(vaultAccount.amount)).to.equal(0);
    expect(streamAccount.milestoneReleased).to.equal(true);
    expect(streamAccount.status).to.deep.equal({ completed: {} });
  });

  it("rejects milestone release after the stream expires", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig } = await createStream({
      ...fixture,
      streamId: new anchor.BN(17),
      totalAmount: 1_000,
      startTimestamp: currentTime - 1_000,
      endTimestamp: currentTime - 1,
      scheduleType: milestone,
      releaseAuthority: fixture.creator.publicKey,
    });

    try {
      await releaseMilestone({
        authority: fixture.creator,
        streamConfig,
      });
      expect.fail("milestone release should fail after stream expiry");
    } catch (error) {
      expect((error as Error).toString()).to.contain("StreamExpired");
    }
  });

  it("cancels before cliff and returns all locked tokens to the creator", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(12),
      totalAmount: 1_000,
      startTimestamp: currentTime,
      cliffTimestamp: currentTime + 60,
      endTimestamp: currentTime + 1_060,
      scheduleType: cliffLinear,
      isCancellable: true,
    });

    await cancelStream({
      authority: fixture.creator,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
      creatorTokenAccount: fixture.creatorTokenAccount,
    });

    const recipientAccount = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    const creatorAccount = await getAccount(
      connection,
      fixture.creatorTokenAccount
    );
    const vaultAccount = await getAccount(connection, vault);
    const streamAccount = await program.account.streamConfig.fetch(
      streamConfig
    );

    expect(Number(recipientAccount.amount)).to.equal(0);
    expect(Number(creatorAccount.amount)).to.equal(1_000);
    expect(Number(vaultAccount.amount)).to.equal(0);
    expect(streamAccount.amountClaimed.toNumber()).to.equal(0);
    expect(streamAccount.status).to.deep.equal({ cancelled: {} });
  });

  it("cancels mid-stream and splits unlocked and locked tokens", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(13),
      totalAmount: 1_000,
      startTimestamp: currentTime - 500,
      endTimestamp: currentTime + 500,
      isCancellable: true,
    });

    await cancelStream({
      authority: fixture.creator,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
      creatorTokenAccount: fixture.creatorTokenAccount,
    });

    const recipientAccount = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    const creatorAccount = await getAccount(
      connection,
      fixture.creatorTokenAccount
    );
    const vaultAccount = await getAccount(connection, vault);
    const recipientAmount = Number(recipientAccount.amount);
    const creatorAmount = Number(creatorAccount.amount);

    expect(recipientAmount).to.be.greaterThanOrEqual(495);
    expect(recipientAmount).to.be.lessThanOrEqual(510);
    expect(creatorAmount).to.equal(1_000 - recipientAmount);
    expect(Number(vaultAccount.amount)).to.equal(0);
  });

  it("rejects cancel after a stream is fully vested", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(14),
      totalAmount: 1_000,
      startTimestamp: currentTime - 1_000,
      endTimestamp: currentTime - 1,
      isCancellable: true,
    });

    try {
      await cancelStream({
        authority: fixture.creator,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
        creatorTokenAccount: fixture.creatorTokenAccount,
      });
      expect.fail("cancel should fail after full vest");
    } catch (error) {
      expect((error as Error).toString()).to.contain("FullyVested");
    }
  });

  it("rejects already-cancelled streams", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(15),
      totalAmount: 1_000,
      startTimestamp: currentTime,
      endTimestamp: currentTime + 1_000,
      isCancellable: true,
    });

    await cancelStream({
      authority: fixture.creator,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
      creatorTokenAccount: fixture.creatorTokenAccount,
    });

    try {
      await cancelStream({
        authority: fixture.creator,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
        creatorTokenAccount: fixture.creatorTokenAccount,
      });
      expect.fail("cancel should reject already-cancelled streams");
    } catch (error) {
      expect((error as Error).toString()).to.contain("AlreadyCancelled");
    }
  });

  it("rejects unauthorized cancellation", async () => {
    const fixture = await createTokenFixture();
    const attacker = anchor.web3.Keypair.generate();
    await airdrop(attacker.publicKey);
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(16),
      totalAmount: 1_000,
      startTimestamp: currentTime,
      endTimestamp: currentTime + 1_000,
      isCancellable: true,
    });

    try {
      await cancelStream({
        authority: attacker,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
        creatorTokenAccount: fixture.creatorTokenAccount,
      });
      expect.fail("cancel should reject non-creator signer");
    } catch (error) {
      expect((error as Error).toString()).to.contain("Unauthorized");
    }
  });

  it("rejects zero amount streams", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();

    try {
      await createStream({
        ...fixture,
        streamId: new anchor.BN(18),
        totalAmount: 0,
        startTimestamp: currentTime,
        endTimestamp: currentTime + 1_000,
      });
      expect.fail("create_stream should reject zero amount");
    } catch (error) {
      expect((error as Error).toString()).to.contain("ZeroAmount");
    }
  });

  it("rejects withdrawal at the cliff boundary before linear time has elapsed", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(19),
      totalAmount: 1_000,
      startTimestamp: currentTime - 100,
      cliffTimestamp: currentTime,
      endTimestamp: currentTime + 100,
      scheduleType: cliffLinear,
    });

    try {
      await withdraw({
        recipient: fixture.recipient,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
      });
      expect.fail("withdraw should reject at the cliff boundary");
    } catch (error) {
      expect((error as Error).toString()).to.contain("NothingToWithdraw");
    }
  });

  it("rejects cancel at the end boundary because the stream is fully vested", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(20),
      totalAmount: 1_000,
      startTimestamp: currentTime - 1_000,
      endTimestamp: currentTime,
      isCancellable: true,
    });

    try {
      await cancelStream({
        authority: fixture.creator,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
        creatorTokenAccount: fixture.creatorTokenAccount,
      });
      expect.fail("cancel should reject at the fully vested end boundary");
    } catch (error) {
      expect((error as Error).toString()).to.contain("FullyVested");
    }
  });

  it("rejects a second withdrawal after the stream is completed", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(21),
      totalAmount: 1_000,
      startTimestamp: currentTime - 1_000,
      endTimestamp: currentTime - 1,
    });

    await withdraw({
      recipient: fixture.recipient,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
    });

    try {
      await withdraw({
        recipient: fixture.recipient,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
      });
      expect.fail("second withdraw should reject completed streams");
    } catch (error) {
      expect((error as Error).toString()).to.contain("StreamNotActive");
    }
  });

  it("rejects cancellation when the stream is not cancellable", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(22),
      totalAmount: 1_000,
      startTimestamp: currentTime,
      endTimestamp: currentTime + 1_000,
      isCancellable: false,
    });

    try {
      await cancelStream({
        authority: fixture.creator,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
        creatorTokenAccount: fixture.creatorTokenAccount,
      });
      expect.fail("cancel should reject non-cancellable streams");
    } catch (error) {
      expect((error as Error).toString()).to.contain("CancellationDisabled");
    }
  });

  it("rejects cancellation when cancel authority is neither", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(23),
      totalAmount: 1_000,
      startTimestamp: currentTime,
      endTimestamp: currentTime + 1_000,
      isCancellable: true,
      cancelAuthority: neither,
    });

    try {
      await cancelStream({
        authority: fixture.creator,
        streamConfig,
        vault,
        recipientTokenAccount: fixture.recipientTokenAccount,
        creatorTokenAccount: fixture.creatorTokenAccount,
      });
      expect.fail("cancel should reject when authority is neither");
    } catch (error) {
      expect((error as Error).toString()).to.contain("Unauthorized");
    }
  });

  it("allows the recipient to cancel when cancel authority is either", async () => {
    const fixture = await createTokenFixture();
    const currentTime = await nowSeconds();
    const { streamConfig, vault } = await createStream({
      ...fixture,
      streamId: new anchor.BN(24),
      totalAmount: 1_000,
      startTimestamp: currentTime + 60,
      endTimestamp: currentTime + 1_060,
      isCancellable: true,
      cancelAuthority: either,
    });

    await cancelStream({
      authority: fixture.recipient,
      streamConfig,
      vault,
      recipientTokenAccount: fixture.recipientTokenAccount,
      creatorTokenAccount: fixture.creatorTokenAccount,
    });

    const streamAccount = await program.account.streamConfig.fetch(
      streamConfig
    );
    const creatorAccount = await getAccount(
      connection,
      fixture.creatorTokenAccount
    );
    const recipientAccount = await getAccount(
      connection,
      fixture.recipientTokenAccount
    );
    const vaultAccount = await getAccount(connection, vault);

    expect(streamAccount.status).to.deep.equal({ cancelled: {} });
    expect(Number(creatorAccount.amount)).to.equal(1_000);
    expect(Number(recipientAccount.amount)).to.equal(0);
    expect(Number(vaultAccount.amount)).to.equal(0);
  });
});
