/**
 * Price Oracle Service
 * Fetches real-time STX-to-USD price and calculates minimum deposit amounts
 */

// Minimum deposit in USD
export const MINIMUM_DEPOSIT_USD = 2.0;

// Cache duration in milliseconds (2 minutes for more frequent updates)
const CACHE_DURATION = 2 * 60 * 1000;

// Price cache
interface PriceCache {
  price: number;
  timestamp: number;
}

let priceCache: PriceCache | null = null;

/**
 * Force clear price cache (useful for immediate updates)
 */
export function clearPriceCache(): void {
  priceCache = null;
}

/**
 * Fetch STX price from multiple sources with fallback
 */
export async function fetchSTXPrice(forceRefresh: boolean = false): Promise<number> {
  // Check cache first (unless force refresh is requested)
  if (!forceRefresh && priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.price;
  }

  const sources = [
    // CoinGecko API (primary)
    async () => {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd');
      const data = await response.json();
      return data.blockstack?.usd;
    },
    
    // CoinMarketCap alternative (backup)
    async () => {
      const response = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=STX&convert=USD', {
        headers: {
          'X-CMC_PRO_API_KEY': process.env.NEXT_PUBLIC_CMC_API_KEY || '',
        },
      });
      const data = await response.json();
      return data.data?.STX?.quote?.USD?.price;
    },
    
    // Fallback to a reasonable default if APIs fail
    async () => {
      console.warn('All price APIs failed, using fallback price');
      return 0.5; // Fallback price of $0.50 per STX
    },
  ];

  for (const source of sources) {
    try {
      const price = await source();
      if (price && typeof price === 'number' && price > 0) {
        // Cache the successful result
        priceCache = {
          price,
          timestamp: Date.now(),
        };
        return price;
      }
    } catch (error) {
      console.warn('Price source failed:', error);
      continue;
    }
  }

  // This should never happen due to fallback, but just in case
  throw new Error('All price sources failed');
}

/**
 * Calculate minimum STX amount for $2 USD
 */
export async function getMinimumSTXAmount(forceRefresh: boolean = false): Promise<number> {
  try {
    const stxPrice = await fetchSTXPrice(forceRefresh);
    const minimumSTX = MINIMUM_DEPOSIT_USD / stxPrice;
    
    // Round up to 6 decimal places to ensure we meet the minimum
    return Math.ceil(minimumSTX * 1000000) / 1000000;
  } catch (error) {
    console.error('Failed to calculate minimum STX amount:', error);
    // Fallback to a reasonable minimum (4 STX if price fetch fails)
    return 4.0;
  }
}

/**
 * Get contract price information for validation
 */
export async function getContractPriceInfo(): Promise<{
  stxPrice: number;
  minimumSTX: number;
  usdMinimum: number;
  lastUpdate: number;
}> {
  try {
    const { callReadOnlyFunction } = await import('@/lib/contract');
    const { CONTRACT_CONFIG } = await import('@/lib/stacks-config');
    
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-deposit-validation-info',
      functionArgs: ['u1000000'], // 1 STX for reference
    });

    if (result) {
      return {
        stxPrice: parseInt(result['stx-price']?.value || '500000') / 1000000, // Convert from 6 decimal precision
        minimumSTX: parseInt(result['minimum-stx-required']?.value || '4000000') / 1000000, // Convert from microstacks
        usdMinimum: parseInt(result['usd-minimum']?.value || '2000000') / 1000000, // Convert from 6 decimal precision
        lastUpdate: parseInt(result['last-price-update']?.value || '0'),
      };
    }
    
    throw new Error('Invalid contract response');
  } catch (error) {
    console.error('Failed to get contract price info:', error);
    // Return fallback values
    return {
      stxPrice: 0.5,
      minimumSTX: 4.0,
      usdMinimum: 2.0,
      lastUpdate: 0,
    };
  }
}

/**
 * Validate if an amount meets the minimum requirement (using both market and contract data)
 */
export async function validateMinimumDeposit(stxAmount: number): Promise<{
  isValid: boolean;
  minimumRequired: number;
  currentPrice: number;
  usdValue: number;
  contractPrice: number;
  contractMinimum: number;
  priceDiscrepancy: number;
}> {
  try {
    const [marketData, contractData] = await Promise.all([
      Promise.all([getMinimumSTXAmount(), fetchSTXPrice()]),
      getContractPriceInfo(),
    ]);

    const [marketMinimum, marketPrice] = marketData;
    const usdValue = stxAmount * marketPrice;
    const priceDiscrepancy = Math.abs(marketPrice - contractData.stxPrice);
    
    return {
      isValid: stxAmount >= Math.max(marketMinimum, contractData.minimumSTX),
      minimumRequired: Math.max(marketMinimum, contractData.minimumSTX),
      currentPrice: marketPrice,
      usdValue,
      contractPrice: contractData.stxPrice,
      contractMinimum: contractData.minimumSTX,
      priceDiscrepancy,
    };
  } catch (error) {
    console.error('Failed to validate minimum deposit:', error);
    return {
      isValid: stxAmount >= 4.0,
      minimumRequired: 4.0,
      currentPrice: 0.5,
      usdValue: stxAmount * 0.5,
      contractPrice: 0.5,
      contractMinimum: 4.0,
      priceDiscrepancy: 0,
    };
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(price);
}

/**
 * Format STX amount for display
 */
export function formatSTXAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(amount);
}

/**
 * Get price update interval hook with aggressive updating
 */
export function usePriceUpdates(callback: (price: number, minimumSTX: number) => void, intervalMs: number = 15000) {
  if (typeof window === 'undefined') return;

  const updatePrice = async () => {
    try {
      const [price, minimumSTX] = await Promise.all([
        fetchSTXPrice(),
        getMinimumSTXAmount(),
      ]);
      callback(price, minimumSTX);
    } catch (error) {
      console.error('Price update failed:', error);
    }
  };

  // Initial update
  updatePrice();

  // Set up interval with more frequent updates
  const interval = setInterval(updatePrice, intervalMs);

  return () => clearInterval(interval);
}

/**
 * Enhanced price monitoring with multiple update strategies
 */
export function useAdvancedPriceUpdates(callback: (price: number, minimumSTX: number) => void) {
  if (typeof window === 'undefined') return;

  let isActive = true;
  let retryCount = 0;
  const maxRetries = 3;

  const updatePrice = async () => {
    if (!isActive) return;

    try {
      const [price, minimumSTX] = await Promise.all([
        fetchSTXPrice(),
        getMinimumSTXAmount(),
      ]);
      callback(price, minimumSTX);
      retryCount = 0; // Reset retry count on success
    } catch (error) {
      console.error('Price update failed:', error);
      retryCount++;
      
      // Exponential backoff on failures
      if (retryCount <= maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        setTimeout(updatePrice, backoffDelay);
      }
    }
  };

  // Initial update
  updatePrice();

  // Primary interval - every 15 seconds
  const primaryInterval = setInterval(updatePrice, 15000);

  // Secondary interval for cache refresh - every 2 minutes
  const cacheRefreshInterval = setInterval(() => {
    // Force cache refresh by clearing it
    priceCache = null;
    updatePrice();
  }, 2 * 60 * 1000);

  // Page visibility change handler for immediate updates when page becomes visible
  const handleVisibilityChange = () => {
    if (!document.hidden && isActive) {
      // Clear cache and update immediately when page becomes visible
      priceCache = null;
      updatePrice();
    }
  };

  // Focus handler for immediate updates when window gains focus
  const handleFocus = () => {
    if (isActive) {
      priceCache = null;
      updatePrice();
    }
  };

  // Add event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);

  // Cleanup function
  return () => {
    isActive = false;
    clearInterval(primaryInterval);
    clearInterval(cacheRefreshInterval);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
  };
}