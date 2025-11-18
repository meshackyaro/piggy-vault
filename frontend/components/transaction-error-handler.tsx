/**
 * Transaction Error Handler Component
 * Provides user-friendly error messages and recovery suggestions for transaction errors
 */

'use client';

import { useState } from 'react';

export interface TransactionError {
  message: string;
  code?: string;
  details?: string;
  timestamp?: Date;
}

interface TransactionErrorHandlerProps {
  error: TransactionError | string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export default function TransactionErrorHandler({ 
  error, 
  onDismiss, 
  onRetry 
}: TransactionErrorHandlerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorDetails = typeof error === 'object' ? error.details : undefined;

  // Categorize error and provide helpful suggestions
  const getErrorCategory = (message: string) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('wallet') || lowerMessage.includes('connect')) {
      return {
        icon: '👛',
        title: 'Wallet Connection Error',
        suggestions: [
          'Make sure your wallet extension is installed and unlocked',
          'Try refreshing the page and reconnecting your wallet',
          'Check if you have the latest version of your wallet extension',
        ],
      };
    }

    if (lowerMessage.includes('contract') && (lowerMessage.includes('not found') || lowerMessage.includes('does not exist'))) {
      return {
        icon: '📄',
        title: 'Contract Not Found',
        suggestions: [
          'The contract may not be deployed to this network yet',
          'Check if the contract address in .env.local is correct',
          'Deploy the contract using: clarinet deployments apply --testnet',
          'Verify you are connected to the correct network (testnet/mainnet)',
        ],
      };
    }

    if (lowerMessage.includes('insufficient') || lowerMessage.includes('balance')) {
      return {
        icon: '💰',
        title: 'Insufficient Balance',
        suggestions: [
          'Check your wallet balance',
          'Get testnet STX from the faucet: https://explorer.hiro.so/sandbox/faucet',
          'Try depositing a smaller amount',
          'Make sure you have enough STX for both the deposit and transaction fees',
        ],
      };
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return {
        icon: '🌐',
        title: 'Network Error',
        suggestions: [
          'Check your internet connection',
          'The Stacks network might be experiencing issues',
          'Try again in a few moments',
          'Check the Stacks status page: https://status.hiro.so',
        ],
      };
    }

    if (lowerMessage.includes('cancelled') || lowerMessage.includes('rejected')) {
      return {
        icon: '❌',
        title: 'Transaction Cancelled',
        suggestions: [
          'You cancelled the transaction in your wallet',
          'Try again if you want to complete the transaction',
        ],
      };
    }

    if (lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
      return {
        icon: '⚠️',
        title: 'Invalid Transaction Parameters',
        suggestions: [
          'Check that the amount is valid and meets minimum requirements',
          'Verify that all required fields are filled correctly',
          'Try refreshing the page and submitting again',
        ],
      };
    }

    if (lowerMessage.includes('fee') || lowerMessage.includes('nonce')) {
      return {
        icon: '⛽',
        title: 'Transaction Fee Error',
        suggestions: [
          'Try increasing the transaction fee',
          'Wait a moment and try again',
          'Check that you have enough STX for transaction fees',
        ],
      };
    }

    if (lowerMessage.includes('locked') || lowerMessage.includes('lock period')) {
      return {
        icon: '🔒',
        title: 'Funds Still Locked',
        suggestions: [
          'Your funds are still in the lock period',
          'Check the remaining time in your vault info',
          'You can only withdraw after the lock period expires',
        ],
      };
    }

    // Default category
    return {
      icon: '❗',
      title: 'Transaction Error',
      suggestions: [
        'Try refreshing the page and attempting the transaction again',
        'Check the transaction diagnostics for more information',
        'Contact support if the problem persists',
      ],
    };
  };

  const category = getErrorCategory(errorMessage);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm overflow-hidden">
      {/* Error Header */}
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">{category.icon}</span>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              {category.title}
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{errorMessage}</p>
            </div>

            {/* Suggestions */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                💡 What you can try:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {category.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>

            {/* Error Details (Expandable) */}
            {errorDetails && (
              <div className="mt-4">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  {isExpanded ? 'Hide' : 'Show'} technical details
                </button>
                {isExpanded && (
                  <div className="mt-2 p-3 bg-red-100 rounded border border-red-300">
                    <pre className="text-xs text-red-800 whitespace-pre-wrap break-words">
                      {errorDetails}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage transaction errors
 */
export function useTransactionError() {
  const [error, setError] = useState<TransactionError | null>(null);

  const handleError = (err: unknown) => {
    const errorObj: TransactionError = {
      message: err instanceof Error ? err.message : 'An unknown error occurred',
      details: err instanceof Error ? err.stack : undefined,
      timestamp: new Date(),
    };
    setError(errorObj);
  };

  const clearError = () => setError(null);

  return {
    error,
    setError: handleError,
    clearError,
  };
}
