/**
 * All Deposits List Component
 * Displays all deposits (individual and group) with withdrawal functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useMultipleDeposits } from '@/hooks/use-multiple-deposits';
import { formatRemainingTime, convertOptionToLabel } from '@/lib/lock-options';
import { createWithdrawTransaction } from '@/lib/transaction-builder';

interface Deposit {
  id: number;
  amount: number;
  depositBlock: number;
  lockExpiry: number;
  lockOption: number;
  withdrawn: boolean;
  name?: string;
}

export default function AllDepositsList() {
  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
      <h2 className="text-xl font-semibold text-white mb-4">All Deposits</h2>
      <p className="text-gray-400">Component under development</p>
    </div>
  );
}
