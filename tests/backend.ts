import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Backend } from "../target/types/backend";

describe("backend", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.backend as Program<Backend>;

  it("loads the deployed program workspace", async () => {
    expect(program.programId.toBase58()).to.equal(
      "Fwboky3ufxoT43egazAymFmjyAtJVDJLVJs977oLSN4V"
    );
  });
});
