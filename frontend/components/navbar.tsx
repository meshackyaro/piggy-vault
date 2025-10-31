/**
 * Navigation Bar Component
 * Provides app navigation and wallet connection status
 */

'use client';

import Link from 'next/link';
import { useStacks } from '@/hooks/use-stacks';

export default function Navbar() {
  const { user, isConnected } = useStacks();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PV</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Piggy Vault</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link 
              href="/deposit" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Deposit
            </Link>
            <Link 
              href="/withdraw" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Withdraw
            </Link>
          </div>

          {/* Wallet Status */}
          <div className="flex items-center">
            {isConnected && user ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 font-mono">
                  {user.address.slice(0, 6)}...{user.address.slice(-4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-500">Not Connected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}