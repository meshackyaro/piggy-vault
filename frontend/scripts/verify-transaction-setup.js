#!/usr/bin/env node

/**
 * Transaction Setup Verification Script
 * Verifies that all required configuration is in place for transactions to work
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Verifying Transaction Setup...\n");

let hasErrors = false;
let hasWarnings = false;

// Check 1: .env.local exists
console.log("1️⃣  Checking .env.local file...");
const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("   ❌ .env.local file not found");
  console.log("   💡 Create .env.local with required environment variables");
  hasErrors = true;
} else {
  console.log("   ✅ .env.local file exists");

  // Check environment variables
  const envContent = fs.readFileSync(envPath, "utf8");

  console.log("\n2️⃣  Checking environment variables...");

  const requiredVars = [
    "NEXT_PUBLIC_NETWORK",
    "NEXT_PUBLIC_CONTRACT_ADDRESS",
    "NEXT_PUBLIC_CONTRACT_NAME",
    "NEXT_PUBLIC_STACKS_API_URL",
  ];

  requiredVars.forEach((varName) => {
    const regex = new RegExp(`${varName}=(.+)`, "i");
    const match = envContent.match(regex);

    if (!match) {
      console.log(`   ❌ ${varName} not set`);
      hasErrors = true;
    } else {
      const value = match[1].trim();
      if (value === "" || value === "DEPLOY_CONTRACT_FIRST") {
        console.log(
          `   ⚠️  ${varName} is set but needs a valid value: "${value}"`
        );
        hasWarnings = true;
      } else {
        console.log(`   ✅ ${varName} is set`);

        // Additional validation for contract address
        if (varName === "NEXT_PUBLIC_CONTRACT_ADDRESS") {
          if (!value.startsWith("ST") && !value.startsWith("SP")) {
            console.log(
              `   ⚠️  Contract address should start with ST (testnet) or SP (mainnet)`
            );
            hasWarnings = true;
          }
          if (value.length < 38 || value.length > 45) {
            console.log(
              `   ⚠️  Contract address length seems incorrect (${value.length} chars)`
            );
            hasWarnings = true;
          }
        }
      }
    }
  });
}

// Check 2: Required files exist
console.log("\n3️⃣  Checking required files...");
const requiredFiles = [
  "lib/transaction-builder.ts",
  "lib/stacks-config.ts",
  "lib/contract.ts",
  "components/transaction-diagnostics.tsx",
  "components/transaction-error-handler.tsx",
  "contexts/wallet-context.tsx",
];

requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, "..", file);
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ ${file} not found`);
    hasErrors = true;
  } else {
    console.log(`   ✅ ${file} exists`);
  }
});

// Check 3: Package dependencies
console.log("\n4️⃣  Checking package dependencies...");
const packageJsonPath = path.join(__dirname, "..", "package.json");
if (!fs.existsSync(packageJsonPath)) {
  console.log("   ❌ package.json not found");
  hasErrors = true;
} else {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const requiredDeps = [
    "@stacks/connect",
    "@stacks/network",
    "@stacks/transactions",
  ];

  requiredDeps.forEach((dep) => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`   ✅ ${dep} installed (${packageJson.dependencies[dep]})`);
    } else {
      console.log(`   ❌ ${dep} not installed`);
      hasErrors = true;
    }
  });
}

// Check 4: Node modules installed
console.log("\n5️⃣  Checking node_modules...");
const nodeModulesPath = path.join(__dirname, "..", "node_modules");
if (!fs.existsSync(nodeModulesPath)) {
  console.log("   ❌ node_modules not found");
  console.log("   💡 Run: npm install");
  hasErrors = true;
} else {
  console.log("   ✅ node_modules exists");
}

// Summary
console.log("\n" + "=".repeat(50));
console.log("📊 Verification Summary\n");

if (!hasErrors && !hasWarnings) {
  console.log("✅ All checks passed! Your transaction setup is ready.");
  console.log("\n🚀 Next steps:");
  console.log("   1. Start the dev server: npm run dev");
  console.log("   2. Open the app in your browser");
  console.log("   3. Check the Transaction Diagnostics panel");
  console.log("   4. Connect your wallet and try a transaction");
} else {
  if (hasErrors) {
    console.log("❌ Found critical issues that need to be fixed:");
    console.log("   - Review the errors above");
    console.log("   - Fix the configuration issues");
    console.log("   - Run this script again to verify");
  }

  if (hasWarnings) {
    console.log("\n⚠️  Found warnings that should be addressed:");
    console.log("   - Review the warnings above");
    console.log("   - Update configuration as needed");
    console.log("   - The app may work but could have issues");
  }

  console.log("\n📖 For help, see:");
  console.log("   - TRANSACTION_FIX_GUIDE.md");
  console.log("   - TRANSACTION_FIX_SUMMARY.md");
}

console.log("=".repeat(50) + "\n");

// Exit with appropriate code
process.exit(hasErrors ? 1 : 0);
