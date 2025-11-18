#!/usr/bin/env node

/**
 * Contract Deployment Verification Script
 * Verifies that the contract is actually deployed on the specified network
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

console.log("🔍 Verifying Contract Deployment...\n");

// Load environment variables
const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("❌ .env.local file not found");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
const getEnvVar = (name) => {
  const regex = new RegExp(`${name}=(.+)`, "i");
  const match = envContent.match(regex);
  return match ? match[1].trim() : null;
};

const network = getEnvVar("NEXT_PUBLIC_NETWORK") || "testnet";
const contractAddress = getEnvVar("NEXT_PUBLIC_CONTRACT_ADDRESS");
const contractName = getEnvVar("NEXT_PUBLIC_CONTRACT_NAME");
const apiUrl =
  getEnvVar("NEXT_PUBLIC_STACKS_API_URL") || "https://api.testnet.hiro.so";

console.log("📋 Configuration:");
console.log(`   Network: ${network}`);
console.log(`   Contract Address: ${contractAddress}`);
console.log(`   Contract Name: ${contractName}`);
console.log(`   API URL: ${apiUrl}\n`);

// Validate configuration
let hasErrors = false;

if (!contractAddress) {
  console.log("❌ NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  hasErrors = true;
}

if (!contractName) {
  console.log("❌ NEXT_PUBLIC_CONTRACT_NAME is not set");
  hasErrors = true;
}

if (hasErrors) {
  console.log(
    "\n💡 Please update your .env.local file with the correct values"
  );
  process.exit(1);
}

// Check contract on blockchain
console.log("🌐 Checking contract on blockchain...\n");

const url = `${apiUrl}/v2/contracts/interface/${contractAddress}/${contractName}`;

https
  .get(url, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      if (res.statusCode === 200) {
        try {
          const contractData = JSON.parse(data);

          console.log("✅ Contract found on blockchain!\n");
          console.log("📄 Contract Details:");
          console.log(`   Functions: ${contractData.functions?.length || 0}`);
          console.log(`   Variables: ${contractData.variables?.length || 0}`);
          console.log(`   Maps: ${contractData.maps?.length || 0}\n`);

          // List some key functions
          if (contractData.functions && contractData.functions.length > 0) {
            console.log("🔧 Key Functions:");
            const keyFunctions = [
              "deposit",
              "withdraw",
              "create-deposit",
              "withdraw-deposit",
            ];
            keyFunctions.forEach((funcName) => {
              const func = contractData.functions.find(
                (f) => f.name === funcName
              );
              if (func) {
                console.log(`   ✅ ${funcName} (${func.access})`);
              }
            });
            console.log("");
          }

          console.log("🎉 Contract verification successful!");
          console.log("\n🚀 You can now:");
          console.log("   1. Start the dev server: npm run dev");
          console.log("   2. Connect your wallet");
          console.log("   3. Start making transactions\n");

          // Save verification result
          const verificationResult = {
            timestamp: new Date().toISOString(),
            network,
            contractAddress,
            contractName,
            apiUrl,
            verified: true,
            functionCount: contractData.functions?.length || 0,
            variableCount: contractData.variables?.length || 0,
            mapCount: contractData.maps?.length || 0,
          };

          const resultPath = path.join(
            __dirname,
            "..",
            ".contract-verification.json"
          );
          fs.writeFileSync(
            resultPath,
            JSON.stringify(verificationResult, null, 2)
          );
          console.log(
            "💾 Verification result saved to .contract-verification.json\n"
          );
        } catch (error) {
          console.log("❌ Error parsing contract data:", error.message);
          process.exit(1);
        }
      } else if (res.statusCode === 404) {
        console.log("❌ Contract not found on blockchain!\n");
        console.log("📋 Troubleshooting steps:\n");
        console.log("1️⃣  Deploy the contract:");
        console.log("   clarinet deployments apply --testnet\n");
        console.log("2️⃣  Check if the contract address is correct:");
        console.log(`   Current: ${contractAddress}`);
        console.log("   Expected: The address from deployment output\n");
        console.log("3️⃣  Verify on Stacks Explorer:");
        console.log(
          `   https://explorer.hiro.so/txid/${contractAddress}?chain=${network}\n`
        );
        console.log("4️⃣  Update .env.local with the correct address\n");
        console.log("5️⃣  Restart the development server\n");

        process.exit(1);
      } else {
        console.log(`❌ Unexpected response: ${res.statusCode}`);
        console.log(`   Message: ${data}\n`);
        process.exit(1);
      }
    });
  })
  .on("error", (error) => {
    console.log("❌ Network error:", error.message);
    console.log("\n💡 Possible causes:");
    console.log("   - No internet connection");
    console.log("   - API URL is incorrect");
    console.log("   - Stacks network is down\n");
    console.log("🔗 Check network status: https://status.hiro.so\n");
    process.exit(1);
  });
