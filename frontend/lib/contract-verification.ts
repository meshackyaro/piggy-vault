/**
 * Contract Verification Utilities
 * Helps verify contract deployment and configuration before transactions
 */

import { getStacksNetwork, CONTRACT_CONFIG, isContractConfigValid, getContractConfigError } from './stacks-config';

export interface ContractVerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  contractExists?: boolean;
  contractInfo?: any;
}

/**
 * Verify contract configuration and deployment status
 * @returns Promise<ContractVerificationResult>
 */
export const verifyContractDeployment = async (): Promise<ContractVerificationResult> => {
  const result: ContractVerificationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Step 1: Validate configuration
  if (!isContractConfigValid()) {
    const configError = getContractConfigError();
    result.isValid = false;
    result.errors.push(configError || 'Invalid contract configuration');
    return result;
  }

  // Step 2: Check if contract exists on the network
  try {
    const network = getStacksNetwork();
    const apiUrl = 'coreApiUrl' in network ? network.coreApiUrl : 'https://api.testnet.hiro.so';
    
    // Fetch contract interface
    const response = await fetch(
      `${apiUrl}/v2/contracts/interface/${CONTRACT_CONFIG.address}/${CONTRACT_CONFIG.name}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (response.ok) {
      const contractInfo = await response.json();
      result.contractExists = true;
      result.contractInfo = contractInfo;
      
      // Verify contract has expected functions
      const expectedFunctions = [
        'create-deposit',
        'withdraw-deposit',
        'create-group',
        'join-group-with-deposit',
        'group-deposit',
        'group-withdraw',
      ];
      
      const availableFunctions = contractInfo.functions?.map((f: any) => f.name) || [];
      const missingFunctions = expectedFunctions.filter(fn => !availableFunctions.includes(fn));
      
      if (missingFunctions.length > 0) {
        result.warnings.push(
          `Contract is missing expected functions: ${missingFunctions.join(', ')}. ` +
          'This might be an older version or different contract.'
        );
      }
    } else if (response.status === 404) {
      result.isValid = false;
      result.contractExists = false;
      result.errors.push(
        `Contract not found at ${CONTRACT_CONFIG.address}.${CONTRACT_CONFIG.name}. ` +
        'Please deploy the contract first using: clarinet deployments apply --testnet'
      );
    } else {
      result.warnings.push(
        `Unable to verify contract deployment (HTTP ${response.status}). ` +
        'The contract might exist but the API is unavailable.'
      );
    }
  } catch (error) {
    result.warnings.push(
      `Network error while verifying contract: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'Please check your internet connection and try again.'
    );
  }

  return result;
};

/**
 * Get user-friendly deployment instructions
 * @returns Deployment instructions as string array
 */
export const getDeploymentInstructions = (): string[] => {
  return [
    '1. Ensure you have Clarinet installed (https://github.com/hirosystems/clarinet)',
    '2. Navigate to your project root directory',
    '3. Run: clarinet deployments apply --testnet',
    '4. Wait for the deployment to complete',
    '5. Copy the deployed contract address from the output',
    '6. Update frontend/.env.local:',
    '   NEXT_PUBLIC_CONTRACT_ADDRESS=<your-deployed-address>',
    '7. Restart the development server: npm run dev',
  ];
};

/**
 * Validate transaction parameters before submission
 * @param params Transaction parameters
 * @returns Validation result with errors if any
 */
export const validateTransactionParams = (params: {
  contractAddress?: string;
  contractName?: string;
  functionName?: string;
  functionArgs?: any[];
  network?: any;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!params.contractAddress || params.contractAddress === '') {
    errors.push('Contract address is required');
  }

  if (!params.contractName || params.contractName === '') {
    errors.push('Contract name is required');
  }

  if (!params.functionName || params.functionName === '') {
    errors.push('Function name is required');
  }

  if (!params.functionArgs || !Array.isArray(params.functionArgs)) {
    errors.push('Function arguments must be an array');
  }

  if (!params.network || !params.network.coreApiUrl) {
    errors.push('Network configuration is invalid');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Log transaction details for debugging
 * @param txDetails Transaction details
 */
export const logTransactionDetails = (txDetails: {
  functionName: string;
  params: any;
  network: string;
  userAddress?: string;
}) => {
  console.group('🔍 Transaction Details');
  console.log('Function:', txDetails.functionName);
  console.log('Parameters:', txDetails.params);
  console.log('Network:', txDetails.network);
  console.log('Contract:', `${CONTRACT_CONFIG.address}.${CONTRACT_CONFIG.name}`);
  if (txDetails.userAddress) {
    console.log('User Address:', txDetails.userAddress);
  }
  console.log('Timestamp:', new Date().toISOString());
  console.groupEnd();
};

/**
 * Check if wallet is properly connected
 * @param user User object from wallet connection
 * @returns Validation result
 */
export const validateWalletConnection = (user: any): { isValid: boolean; error?: string } => {
  if (!user) {
    return {
      isValid: false,
      error: 'Wallet not connected. Please connect your wallet first.',
    };
  }

  if (!user.address || user.address === '') {
    return {
      isValid: false,
      error: 'Wallet address not found. Please reconnect your wallet.',
    };
  }

  // Validate address format
  if (!user.address.startsWith('ST') && !user.address.startsWith('SP')) {
    return {
      isValid: false,
      error: 'Invalid wallet address format. Please reconnect your wallet.',
    };
  }

  return { isValid: true };
};
