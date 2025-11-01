import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("StackIt Contract", () => {
  beforeEach(() => {
    // Reset simnet state before each test
    simnet.setEpoch("3.0");
  });

  describe("Deposit Functionality", () => {
    it("should allow a user to deposit STX with valid lock option", () => {
      const depositAmount = 100_000_000; // 100 STX in microstacks
      const lockOption = 5; // 1 day lock
      
      const depositResult = simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(depositAmount), Cl.uint(lockOption)],
        deployer
      );

      expect(depositResult.result).toBeOk(Cl.uint(depositAmount));

      // Verify balance is updated
      const balance = simnet.callReadOnlyFn(
        "StackIt",
        "get-balance",
        [Cl.principal(deployer)],
        deployer
      );
      expect(balance.result).toBeUint(depositAmount);

      // Verify deposit info is stored correctly
      const depositInfo = simnet.callReadOnlyFn(
        "StackIt",
        "get-deposit",
        [Cl.principal(deployer)],
        deployer
      );
      
      expect(depositInfo.result).toBeTuple({
        amount: Cl.uint(depositAmount),
        "deposit-block": Cl.uint(simnet.blockHeight),
        "lock-expiry": Cl.uint(simnet.blockHeight + 144) // 1 day = 144 blocks
      });
    });

    it("should reject deposits with zero amount", () => {
      const depositResult = simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(0), Cl.uint(5)],
        deployer
      );

      expect(depositResult.result).toBeErr(Cl.uint(100)); // ERR-INVALID-AMOUNT
    });

    it("should reject deposits with invalid lock option", () => {
      const depositResult = simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(1000000), Cl.uint(99)], // Invalid lock option
        deployer
      );

      expect(depositResult.result).toBeErr(Cl.uint(105)); // ERR-INVALID-LOCK-OPTION
    });

    it("should handle multiple deposits from same user (overwrites previous)", () => {
      // First deposit
      simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(50_000_000), Cl.uint(1)], // 1 hour lock
        deployer
      );

      // Second deposit (should overwrite)
      const secondDeposit = simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(100_000_000), Cl.uint(5)], // 1 day lock
        deployer
      );

      expect(secondDeposit.result).toBeOk(Cl.uint(100_000_000));

      const balance = simnet.callReadOnlyFn(
        "StackIt",
        "get-balance",
        [Cl.principal(deployer)],
        deployer
      );
      expect(balance.result).toBeUint(100_000_000); // Only second deposit amount
    });

    it("should handle deposits from multiple users", () => {
      const amount1 = 50_000_000;
      const amount2 = 75_000_000;

      // User 1 deposits
      simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(amount1), Cl.uint(5)],
        wallet1
      );

      // User 2 deposits
      simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(amount2), Cl.uint(7)],
        wallet2
      );

      // Check both balances
      const balance1 = simnet.callReadOnlyFn(
        "StackIt",
        "get-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      const balance2 = simnet.callReadOnlyFn(
        "StackIt",
        "get-balance",
        [Cl.principal(wallet2)],
        wallet2
      );

      expect(balance1.result).toBeUint(amount1);
      expect(balance2.result).toBeUint(amount2);
    });
  });

  describe("Lock Duration Functionality", () => {
    it("should correctly calculate lock durations for all options", () => {
      const lockOptions = [
        { option: 1, expectedBlocks: 6 },     // 1 hour
        { option: 2, expectedBlocks: 18 },    // 3 hours
        { option: 3, expectedBlocks: 36 },    // 6 hours
        { option: 4, expectedBlocks: 48 },    // 8 hours
        { option: 5, expectedBlocks: 144 },   // 1 day
        { option: 6, expectedBlocks: 720 },   // 5 days
        { option: 7, expectedBlocks: 1008 },  // 1 week
        { option: 8, expectedBlocks: 2016 },  // 2 weeks
        { option: 9, expectedBlocks: 4320 },  // 1 month
        { option: 10, expectedBlocks: 12960 }, // 3 months
        { option: 11, expectedBlocks: 25920 }, // 6 months
        { option: 12, expectedBlocks: 38880 }, // 9 months
        { option: 13, expectedBlocks: 52560 }  // 1 year
      ];

      lockOptions.forEach(({ option, expectedBlocks }) => {
        const duration = simnet.callReadOnlyFn(
          "StackIt",
          "get-lock-duration",
          [Cl.uint(option)],
          deployer
        );
        expect(duration.result).toBeUint(expectedBlocks);
      });
    });

    it("should return 0 for invalid lock options", () => {
      const invalidOptions = [0, 14, 99, 1000];
      
      invalidOptions.forEach(option => {
        const duration = simnet.callReadOnlyFn(
          "StackIt",
          "get-lock-duration",
          [Cl.uint(option)],
          deployer
        );
        expect(duration.result).toBeUint(0);
      });
    });
  });

  describe("Withdrawal Functionality", () => {
    beforeEach(() => {
      // Setup: deposit 100 STX with 1-hour lock for most tests
      simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(100_000_000), Cl.uint(1)], // 1 hour = 6 blocks
        deployer
      );
    });

    it("should prevent withdrawal before lock period expires", () => {
      const withdrawResult = simnet.callPublicFn(
        "StackIt",
        "withdraw",
        [Cl.uint(50_000_000)],
        deployer
      );

      expect(withdrawResult.result).toBeErr(Cl.uint(101)); // ERR-STILL-LOCKED
    });

    it("should allow partial withdrawal after lock period", () => {
      const withdrawAmount = 30_000_000;
      
      // Mine blocks to pass lock period
      simnet.mineEmptyBlocks(7); // More than 6 blocks needed

      const withdrawResult = simnet.callPublicFn(
        "StackIt",
        "withdraw",
        [Cl.uint(withdrawAmount)],
        deployer
      );

      expect(withdrawResult.result).toBeOk(Cl.uint(withdrawAmount));

      // Check remaining balance
      const balance = simnet.callReadOnlyFn(
        "StackIt",
        "get-balance",
        [Cl.principal(deployer)],
        deployer
      );
      expect(balance.result).toBeUint(70_000_000);
    });

    it("should allow full withdrawal and delete deposit record", () => {
      const fullAmount = 100_000_000;
      
      // Mine blocks to pass lock period
      simnet.mineEmptyBlocks(7);

      const withdrawResult = simnet.callPublicFn(
        "StackIt",
        "withdraw",
        [Cl.uint(fullAmount)],
        deployer
      );

      expect(withdrawResult.result).toBeOk(Cl.uint(fullAmount));

      // Check balance is now zero
      const balance = simnet.callReadOnlyFn(
        "StackIt",
        "get-balance",
        [Cl.principal(deployer)],
        deployer
      );
      expect(balance.result).toBeUint(0);

      // Verify deposit record is deleted
      const depositInfo = simnet.callReadOnlyFn(
        "StackIt",
        "get-deposit",
        [Cl.principal(deployer)],
        deployer
      );
      expect(depositInfo.result).toBeTuple({
        amount: Cl.uint(0),
        "deposit-block": Cl.uint(0),
        "lock-expiry": Cl.uint(0)
      });
    });

    it("should prevent withdrawal of more than balance", () => {
      // Mine blocks to pass lock period
      simnet.mineEmptyBlocks(7);

      const withdrawResult = simnet.callPublicFn(
        "StackIt",
        "withdraw",
        [Cl.uint(200_000_000)], // More than deposited
        deployer
      );

      expect(withdrawResult.result).toBeErr(Cl.uint(104)); // ERR-INSUFFICIENT-BALANCE
    });

    it("should prevent withdrawal from users with no deposits", () => {
      const withdrawResult = simnet.callPublicFn(
        "StackIt",
        "withdraw",
        [Cl.uint(10_000_000)],
        wallet1 // User who hasn't deposited
      );

      expect(withdrawResult.result).toBeErr(Cl.uint(102)); // ERR-NO-DEPOSIT
    });
  });

  describe("Read-Only Functions", () => {
    beforeEach(() => {
      // Setup: deposit with 1-day lock
      simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(100_000_000), Cl.uint(5)], // 1 day = 144 blocks
        deployer
      );
    });

    it("should correctly report lock status", () => {
      // Should be locked initially
      const isLocked = simnet.callReadOnlyFn(
        "StackIt",
        "is-locked",
        [Cl.principal(deployer)],
        deployer
      );
      expect(isLocked.result).toBeBool(true);

      // Mine blocks to pass lock period
      simnet.mineEmptyBlocks(145);

      const isLockedAfter = simnet.callReadOnlyFn(
        "StackIt",
        "is-locked",
        [Cl.principal(deployer)],
        deployer
      );
      expect(isLockedAfter.result).toBeBool(false);
    });

    it("should correctly calculate remaining lock blocks", () => {
      const remainingBlocks = simnet.callReadOnlyFn(
        "StackIt",
        "get-remaining-lock-blocks",
        [Cl.principal(deployer)],
        deployer
      );
      expect(remainingBlocks.result).toBeUint(144); // Full lock period remaining

      // Mine some blocks
      simnet.mineEmptyBlocks(50);

      const remainingAfter = simnet.callReadOnlyFn(
        "StackIt",
        "get-remaining-lock-blocks",
        [Cl.principal(deployer)],
        deployer
      );
      expect(remainingAfter.result).toBeUint(94); // 144 - 50 = 94

      // Mine past lock period
      simnet.mineEmptyBlocks(100);

      const remainingExpired = simnet.callReadOnlyFn(
        "StackIt",
        "get-remaining-lock-blocks",
        [Cl.principal(deployer)],
        deployer
      );
      expect(remainingExpired.result).toBeUint(0);
    });

    it("should return correct lock expiry block height", () => {
      const currentBlock = simnet.blockHeight;
      const lockExpiry = simnet.callReadOnlyFn(
        "StackIt",
        "get-lock-expiry",
        [Cl.principal(deployer)],
        deployer
      );
      expect(lockExpiry.result).toBeUint(currentBlock + 144);
    });

    it("should handle queries for users with no deposits", () => {
      const balance = simnet.callReadOnlyFn(
        "StackIt",
        "get-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(balance.result).toBeUint(0);

      const isLocked = simnet.callReadOnlyFn(
        "StackIt",
        "is-locked",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(isLocked.result).toBeBool(false);

      const remainingBlocks = simnet.callReadOnlyFn(
        "StackIt",
        "get-remaining-lock-blocks",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(remainingBlocks.result).toBeUint(0);
    });
  });

  describe("Edge Cases and Complex Scenarios", () => {
    it("should handle multiple deposits and withdrawals correctly", () => {
      // First deposit with short lock
      simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(50_000_000), Cl.uint(1)], // 1 hour
        deployer
      );

      // Wait for lock to expire
      simnet.mineEmptyBlocks(7);

      // Partial withdrawal
      simnet.callPublicFn(
        "StackIt",
        "withdraw",
        [Cl.uint(20_000_000)],
        deployer
      );

      // Second deposit (should overwrite remaining balance)
      simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(100_000_000), Cl.uint(2)], // 3 hours
        deployer
      );

      const finalBalance = simnet.callReadOnlyFn(
        "StackIt",
        "get-balance",
        [Cl.principal(deployer)],
        deployer
      );
      expect(finalBalance.result).toBeUint(100_000_000); // New deposit amount
    });

    it("should handle zero withdrawal amount", () => {
      // Setup deposit and wait for unlock
      simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(100_000_000), Cl.uint(1)],
        deployer
      );
      simnet.mineEmptyBlocks(7);

      const withdrawResult = simnet.callPublicFn(
        "StackIt",
        "withdraw",
        [Cl.uint(0)],
        deployer
      );

      // Zero withdrawal should fail due to stx-transfer? constraints
      expect(withdrawResult.result).toBeErr(Cl.uint(3)); // STX transfer error

      // Balance should remain unchanged
      const balance = simnet.callReadOnlyFn(
        "StackIt",
        "get-balance",
        [Cl.principal(deployer)],
        deployer
      );
      expect(balance.result).toBeUint(100_000_000);
    });

    it("should handle exact lock expiry timing", () => {
      simnet.callPublicFn(
        "StackIt",
        "deposit",
        [Cl.uint(100_000_000), Cl.uint(1)], // 6 blocks
        deployer
      );

      // Mine exactly to the lock expiry block
      simnet.mineEmptyBlocks(6);

      const withdrawResult = simnet.callPublicFn(
        "StackIt",
        "withdraw",
        [Cl.uint(50_000_000)],
        deployer
      );

      expect(withdrawResult.result).toBeOk(Cl.uint(50_000_000));
    });
  });
});