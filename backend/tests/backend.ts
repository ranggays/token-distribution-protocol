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
  const authorityNone = { none: {} };
  const creatorOnly = { creatorOnly: {} };

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
  }: {
    creator: anchor.web3.Keypair;
    recipient: anchor.web3.Keypair;
    mint: anchor.web3.PublicKey;
    creatorTokenAccount: anchor.web3.PublicKey;
    streamId: anchor.BN;
    totalAmount: number;
    startTimestamp: number;
    endTimestamp: number;
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
        cliffTimestamp: new anchor.BN(0),
        cliffAmount: new anchor.BN(0),
        scheduleType: linear,
        authorityType: authorityNone,
        releaseAuthority: null,
        milestoneDescription: Array(128).fill(0),
        isCancellable: false,
        cancelAuthority: creatorOnly,
      })
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
      expect((error as Error).toString()).to.contain("NothingToClaim");
    }
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
});
