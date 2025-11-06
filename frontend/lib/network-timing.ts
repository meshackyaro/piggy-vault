/**
 * Network Timing Utilities
 * Handles dynamic block time calculation for accurate lock duration timing
 */

// Default block times (fallback values)
const DEFAULT_BLOCK_TIMES = {
  mainnet: 10, // 10 minutes per block on mainnet
  testnet: 2,  // Observed: ~2 minutes per block on testnet (much faster)
  devnet: 1,   // Very fast on local devnet
} as const;

// Cache for network timing data
let networkTimingCache: {
  blockTime: number;
  lastUpdated: number;
  network: string;
} | null = null;

/**
 * Get the current network type from environment
 */
export const getCurrentNetwork = (): keyof typeof DEFAULT_BLOCK_TIMES => {
  const network = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  return network as keyof typeof DEFAULT_BLOCK_TIMES;
};

/**
 * Get accurate block time for the current network
 * This function can be enhanced to fetch real-time block timing data
 */
export const getNetworkBlockTime = async (): Promise<number> => {
  const network = getCurrentNetwork();
  
  // Return cached value if recent (within 5 minutes)
  if (networkTimingCache && 
      networkTimingCache.network === network &&
      Date.now() - networkTimingCache.lastUpdated < 5 * 60 * 1000) {
    return networkTimingCache.blockTime;
  }

  try {
    // Try to fetch real-time block timing
    const actualBlockTime = await fetchActualBlockTime();
    
    // Cache the result
    networkTimingCache = {
      blockTime: actualBlockTime,
      lastUpdated: Date.now(),
      network,
    };
    
    console.log(`📊 Network block time updated: ${actualBlockTime} minutes for ${network}`);
    return actualBlockTime;
  } catch (error) {
    console.warn('⚠️ Failed to fetch actual block time, using default:', error);
    return DEFAULT_BLOCK_TIMES[network];
  }
};

/**
 * Fetch actual block time from the network
 */
async function fetchActualBlockTime(): Promise<number> {
  const network = getCurrentNetwork();
  
  if (network === 'devnet') {
    return DEFAULT_BLOCK_TIMES.devnet;
  }

  const apiUrl = network === 'mainnet' 
    ? 'https://api.hiro.so' 
    : 'https://api.testnet.hiro.so';

  try {
    // Fetch recent blocks to calculate average block time
    const response = await fetch(`${apiUrl}/extended/v1/block?limit=20`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const blocks = data.results;

    if (!blocks || blocks.length < 10) {
      throw new Error('Insufficient block data');
    }

    // Calculate average time between blocks
    let totalTimeDiff = 0;
    let validDiffs = 0;

    for (let i = 0; i < blocks.length - 1; i++) {
      const currentTime = new Date(blocks[i].burn_block_time_iso).getTime();
      const nextTime = new Date(blocks[i + 1].burn_block_time_iso).getTime();
      
      const timeDiff = Math.abs(currentTime - nextTime);
      
      // Only count reasonable time differences (between 10 seconds and 30 minutes)
      if (timeDiff > 10 * 1000 && timeDiff < 30 * 60 * 1000) {
        totalTimeDiff += timeDiff;
        validDiffs++;
      }
    }

    if (validDiffs === 0) {
      throw new Error('No valid block time differences found');
    }

    // Convert to minutes and round to reasonable precision
    const avgBlockTimeMs = totalTimeDiff / validDiffs;
    const avgBlockTimeMinutes = Math.round((avgBlockTimeMs / (1000 * 60)) * 10) / 10;

    // Sanity check: block time should be between 0.1 and 30 minutes
    if (avgBlockTimeMinutes < 0.1 || avgBlockTimeMinutes > 30) {
      throw new Error(`Unrealistic block time: ${avgBlockTimeMinutes} minutes`);
    }

    return avgBlockTimeMinutes;
  } catch (error) {
    console.warn('Failed to calculate actual block time:', error);
    throw error;
  }
}

/**
 * Calculate the number of blocks needed for a given time duration
 * @param minutes - Duration in minutes
 * @returns Number of blocks needed
 */
export const calculateBlocksForDuration = async (minutes: number): Promise<number> => {
  const blockTime = await getNetworkBlockTime();
  return Math.ceil(minutes / blockTime);
};

/**
 * Calculate time remaining from block count
 * @param remainingBlocks - Number of blocks remaining
 * @returns Time remaining in minutes
 */
export const calculateTimeFromBlocks = async (remainingBlocks: number): Promise<number> => {
  const blockTime = await getNetworkBlockTime();
  return remainingBlocks * blockTime;
};

/**
 * Get updated lock duration constants based on actual network timing
 */
export const getUpdatedLockDurations = async () => {
  const blockTime = await getNetworkBlockTime();
  
  return {
    ONE_HOUR: Math.ceil(60 / blockTime),           // 1 hour
    THREE_HOURS: Math.ceil(180 / blockTime),       // 3 hours  
    SIX_HOURS: Math.ceil(360 / blockTime),         // 6 hours
    EIGHT_HOURS: Math.ceil(480 / blockTime),       // 8 hours
    ONE_DAY: Math.ceil(1440 / blockTime),          // 1 day
    FIVE_DAYS: Math.ceil(7200 / blockTime),        // 5 days
    ONE_WEEK: Math.ceil(10080 / blockTime),        // 1 week
    TWO_WEEKS: Math.ceil(20160 / blockTime),       // 2 weeks
    ONE_MONTH: Math.ceil(43200 / blockTime),       // 30 days
    THREE_MONTHS: Math.ceil(129600 / blockTime),   // 90 days
    SIX_MONTHS: Math.ceil(259200 / blockTime),     // 180 days
    NINE_MONTHS: Math.ceil(388800 / blockTime),    // 270 days
    ONE_YEAR: Math.ceil(525600 / blockTime),       // 365 days
  };
};

/**
 * Format time remaining with accurate network timing
 */
export const formatRemainingTimeAccurate = async (remainingBlocks: number): Promise<string> => {
  if (remainingBlocks <= 0) return 'Unlocked';
  
  const totalMinutes = await calculateTimeFromBlocks(remainingBlocks);
  
  // Account for transaction mining timing
  if (remainingBlocks === 1) {
    return 'Unlocking soon (next block)';
  }
  
  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)} minutes`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  
  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days < 30) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
  }
  
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  
  if (months < 12) {
    return remainingDays > 0 ? `${months}mo ${remainingDays}d` : `${months} months`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  return remainingMonths > 0 ? `${years}y ${remainingMonths}mo` : `${years} years`;
};