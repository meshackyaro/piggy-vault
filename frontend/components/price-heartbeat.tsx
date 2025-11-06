/**
 * Price Heartbeat Component
 * Shows a subtle heartbeat indicator when price data is being updated
 */

'use client';

import { useState, useEffect } from 'react';
import { useSTXPrice } from '@/hooks/use-stx-price';

interface PriceHeartbeatProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PriceHeartbeat({ 
  className = '', 
  size = 'sm' 
}: PriceHeartbeatProps) {
  const { isLoading, lastUpdated } = useSTXPrice();
  const [heartbeat, setHeartbeat] = useState<boolean>(false);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<number>(0);

  // Heartbeat animation trigger
  useEffect(() => {
    if (!isLoading) {
      setHeartbeat(true);
      const timer = setTimeout(() => setHeartbeat(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdated, isLoading]);

  // Track time since last update
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        setTimeSinceUpdate(seconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-2 h-2';
      case 'md': return 'w-3 h-3';
      case 'lg': return 'w-4 h-4';
      default: return 'w-2 h-2';
    }
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-blue-500';
    if (timeSinceUpdate < 20) return 'bg-green-500';
    if (timeSinceUpdate < 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isLoading) return 'Updating...';
    if (timeSinceUpdate < 20) return 'Live';
    if (timeSinceUpdate < 60) return 'Recent';
    return 'Stale';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <div className={`rounded-full ${getSizeClasses()} ${getStatusColor()} transition-all duration-300 ${
          heartbeat ? 'scale-125' : 'scale-100'
        }`}></div>
        {heartbeat && (
          <div className={`absolute inset-0 rounded-full ${getStatusColor()} animate-ping opacity-75`}></div>
        )}
      </div>
      <span className="text-xs text-gray-400">
        {getStatusText()}
        {!isLoading && timeSinceUpdate > 0 && (
          <span className="ml-1">({timeSinceUpdate}s ago)</span>
        )}
      </span>
    </div>
  );
}