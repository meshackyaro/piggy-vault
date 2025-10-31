/**
 * STX Utility Functions
 * Helper functions for STX amount formatting, validation, and conversion
 */

/**
 * Format STX amount for display with appropriate decimal places
 * @param amount - Amount in STX
 * @param decimals - Number of decimal places (default: 6)
 * @returns Formatted string with STX suffix
 */
export const formatStxAmount = (amount: number, decimals: number = 6): string => {
  if (amount === 0) return '0 STX';
  
  // For very small amounts, show more decimals
  if (amount < 0.001) {
    return `${amount.toFixed(8)} STX`;
  }
  
  // For normal amounts, use specified decimals
  return `${amount.toFixed(decimals)} STX`;
};

/**
 * Format STX amount for input fields (no suffix)
 * @param amount - Amount in STX
 * @param decimals - Number of decimal places (default: 6)
 * @returns Formatted number string
 */
export const formatStxInput = (amount: number, decimals: number = 6): string => {
  return amount.toFixed(decimals);
};

/**
 * Validate STX amount input
 * @param input - String input from user
 * @returns Validation result with parsed amount or error
 */
export const validateStxAmount = (input: string): {
  isValid: boolean;
  amount?: number;
  error?: string;
} => {
  // Check if input is empty
  if (!input || input.trim() === '') {
    return {
      isValid: false,
      error: 'Amount is required',
    };
  }

  // Parse the input
  const amount = parseFloat(input);

  // Check if it's a valid number
  if (isNaN(amount)) {
    return {
      isValid: false,
      error: 'Please enter a valid number',
    };
  }

  // Check if it's positive
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than 0',
    };
  }

  // Check minimum amount (1 microSTX = 0.000001 STX)
  if (amount < 0.000001) {
    return {
      isValid: false,
      error: 'Minimum amount is 0.000001 STX',
    };
  }

  // Check for reasonable maximum (prevent overflow)
  if (amount > 1000000000) {
    return {
      isValid: false,
      error: 'Amount is too large',
    };
  }

  return {
    isValid: true,
    amount,
  };
};

/**
 * Convert microSTX to STX for display
 * @param microStx - Amount in microSTX (from contract)
 * @returns Amount in STX
 */
export const microStxToStx = (microStx: number | bigint | string): number => {
  const amount = typeof microStx === 'string' ? parseFloat(microStx) : Number(microStx);
  return amount / 1_000_000;
};

/**
 * Convert STX to microSTX for contract calls
 * @param stx - Amount in STX
 * @returns Amount in microSTX as bigint
 */
export const stxToMicroStx = (stx: number): bigint => {
  return BigInt(Math.floor(stx * 1_000_000));
};

/**
 * Format block height for display
 * @param blockHeight - Block height number
 * @returns Formatted string
 */
export const formatBlockHeight = (blockHeight: number): string => {
  if (blockHeight === 0) return 'Not set';
  return blockHeight.toLocaleString();
};

/**
 * Calculate time remaining based on blocks
 * @param blocksRemaining - Number of blocks remaining
 * @returns Human-readable time estimate
 */
export const formatTimeRemaining = (blocksRemaining: number): string => {
  if (blocksRemaining <= 0) return 'Unlocked';
  
  // Assuming ~10 minutes per block
  const minutesRemaining = blocksRemaining * 10;
  
  if (minutesRemaining < 60) {
    return `~${minutesRemaining} minutes`;
  }
  
  const hoursRemaining = Math.floor(minutesRemaining / 60);
  const remainingMinutes = minutesRemaining % 60;
  
  if (hoursRemaining < 24) {
    return remainingMinutes > 0 
      ? `~${hoursRemaining}h ${remainingMinutes}m`
      : `~${hoursRemaining} hours`;
  }
  
  const daysRemaining = Math.floor(hoursRemaining / 24);
  const remainingHours = hoursRemaining % 24;
  
  return remainingHours > 0
    ? `~${daysRemaining}d ${remainingHours}h`
    : `~${daysRemaining} days`;
};

/**
 * Truncate address for display
 * @param address - Full Stacks address
 * @param startChars - Characters to show at start (default: 6)
 * @param endChars - Characters to show at end (default: 4)
 * @returns Truncated address string
 */
export const truncateAddress = (
  address: string, 
  startChars: number = 6, 
  endChars: number = 4
): string => {
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};