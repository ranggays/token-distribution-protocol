import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Backend } from "../target/types/backend";

describe("backend", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.backend as Program<Backend>;

  it("loads the deployed program workspace", async () => {
    const programId = program.programId.toBase58();
    expect(programId).to.be.a("string");
    // base58-encoded 32-byte public key is always 43-44 characters
    expect(programId.length)
      .to.be.greaterThanOrEqual(43)
      .and.lessThanOrEqual(44);
  });
});
