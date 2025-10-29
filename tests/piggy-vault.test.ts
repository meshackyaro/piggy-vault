import { describe, it, expect } from "vitest";
import { Cl } from "@stacks/transactions";

describe("Piggy Vault Contract", () => {
  it("should allow a user to deposit STX into the vault", () => {
    const depositAmount = 100_000_000; // 100 STX in microstacks
    
    // user deposits STX
    const depositResult = simnet.callPublicFn(
      "piggy-vault",
      "deposit",
      [Cl.uint(depositAmount)],
      simnet.deployer
    );

    // Expect success
    expect(depositResult.result).toBeOk(Cl.uint(depositAmount));

    // Read user's balance
    const balance = simnet.callReadOnlyFn(
      "piggy-vault",
      "get-balance",
      [Cl.principal(simnet.deployer)],
      simnet.deployer
    );

    expect(balance.result).toBeUint(depositAmount);
  });

  it("should not allow withdrawal before lock period", () => {
    const depositAmount = 100_000_000;
    
    // First deposit
    simnet.callPublicFn(
      "piggy-vault",
      "deposit",
      [Cl.uint(depositAmount)],
      simnet.deployer
    );

    // Try to withdraw immediately (should fail due to lock period)
    const withdrawResult = simnet.callPublicFn(
      "piggy-vault",
      "withdraw",
      [Cl.uint(50_000_000)],
      simnet.deployer
    );

    expect(withdrawResult.result).toBeErr(Cl.uint(101)); // still locked
  });

  it("should allow withdrawal after lock period", () => {
    const depositAmount = 100_000_000;
    const withdrawAmount = 50_000_000;
    
    // First deposit
    simnet.callPublicFn(
      "piggy-vault",
      "deposit",
      [Cl.uint(depositAmount)],
      simnet.deployer
    );

    // Mine blocks to pass lock period (50 blocks)
    simnet.mineEmptyBlocks(51);

    // Try to withdraw
    const withdrawResult = simnet.callPublicFn(
      "piggy-vault",
      "withdraw",
      [Cl.uint(withdrawAmount)],
      simnet.deployer
    );

    expect(withdrawResult.result).toBeOk(Cl.uint(withdrawAmount));

    // Check updated balance
    const balance = simnet.callReadOnlyFn(
      "piggy-vault",
      "get-balance",
      [Cl.principal(simnet.deployer)],
      simnet.deployer
    );

    expect(balance.result).toBeUint(depositAmount - withdrawAmount);
  });

  it("should not allow withdrawal of more than balance", () => {
    const depositAmount = 100_000_000;
    
    // First deposit
    simnet.callPublicFn(
      "piggy-vault",
      "deposit",
      [Cl.uint(depositAmount)],
      simnet.deployer
    );

    // Mine blocks to pass lock period
    simnet.mineEmptyBlocks(51);

    // Try to withdraw more than balance
    const withdrawResult = simnet.callPublicFn(
      "piggy-vault",
      "withdraw",
      [Cl.uint(200_000_000)],
      simnet.deployer
    );

    expect(withdrawResult.result).toBeErr(Cl.uint(104)); // insufficient balance
  });

  it("should prevent non-existent users from withdrawing", () => {
    // Try to withdraw without any deposit
    const withdrawResult = simnet.callPublicFn(
      "piggy-vault",
      "withdraw",
      [Cl.uint(10_000_000)],
      "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5"
    );

    expect(withdrawResult.result).toBeErr(Cl.uint(102)); // no deposit found
  });
});