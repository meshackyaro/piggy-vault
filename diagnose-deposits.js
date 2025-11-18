/**
 * Diagnostic script to check deposit data
 * Run this in browser console on the withdraw page
 */

console.log("=== DEPOSIT DIAGNOSTIC SCRIPT ===");
console.log(
  "Copy and paste this into your browser console on the withdraw page:"
);
console.log("");
console.log(`
// Check if deposits are being fetched
const checkDeposits = async () => {
  console.log('🔍 Starting deposit diagnostic...');
  
  // Get the wallet context
  const walletAddress = window.localStorage.getItem('stacks-wallet-address');
  console.log('👤 Wallet Address:', walletAddress);
  
  // Check localStorage for any deposit data
  console.log('💾 LocalStorage keys:', Object.keys(localStorage));
  
  // Check if React DevTools is available
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools detected');
  } else {
    console.log('⚠️ React DevTools not detected - install for better debugging');
  }
  
  // Look for deposit-related data in the page
  const pageText = document.body.innerText;
  if (pageText.includes('No Deposits Found')) {
    console.log('❌ Page shows "No Deposits Found"');
  } else if (pageText.includes('Loading')) {
    console.log('⏳ Page is loading...');
  } else {
    console.log('✅ Page loaded with content');
  }
  
  // Check network requests
  console.log('📡 Check Network tab for:');
  console.log('  - Calls to /v2/contracts/call-read/');
  console.log('  - Function: get-user-deposit-ids');
  console.log('  - Function: get-user-deposit');
  
  console.log('');
  console.log('🔧 Next steps:');
  console.log('1. Open Network tab and filter for "call-read"');
  console.log('2. Refresh the page');
  console.log('3. Check if get-user-deposit-ids returns any IDs');
  console.log('4. If empty, deposits might be created with legacy deposit() function');
};

checkDeposits();
`);
