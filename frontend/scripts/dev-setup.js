#!/usr/bin/env node

/**
 * Development Setup Script
 * Helps developers get started with the Piggy Vault frontend
 */

const fs = require("fs");
const path = require("path");

console.log("🐷 Piggy Vault Frontend Setup\n");

// Check if .env.local exists
const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("❌ .env.local file not found!");
  console.log("Creating default .env.local file...\n");

  const defaultEnv = `# Stacks Network Configuration
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=ST3QGZ6VKAQVFT5YFXWMDQGSXK1NVAH8DJ8S7M5SG
NEXT_PUBLIC_CONTRACT_NAME=piggy-vault

# Network URLs
NEXT_PUBLIC_STACKS_API_URL=https://api.testnet.hiro.so`;

  fs.writeFileSync(envPath, defaultEnv);
  console.log("✅ Created .env.local with default testnet configuration");
} else {
  console.log("✅ .env.local file exists");
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, "..", "node_modules");
if (!fs.existsSync(nodeModulesPath)) {
  console.log("❌ Dependencies not installed");
  console.log("Run: npm install");
} else {
  console.log("✅ Dependencies installed");
}

console.log("\n📋 Next Steps:");
console.log("1. Contract already deployed on testnet");
console.log("2. Start frontend: npm run dev");
console.log("3. Open http://localhost:3000");

console.log("\n🔧 Configuration:");
console.log("- Network: testnet (api.testnet.hiro.so)");
console.log("- Contract: piggy-vault");
console.log("- Frontend: localhost:3000");

console.log("\n💡 Tips:");
console.log("- Install Hiro Wallet browser extension");
console.log("- Switch wallet to testnet mode");
console.log("- Use testnet STX for testing");
console.log("- Check console for any errors");

console.log("\n🎯 Ready to build! 🚀");
