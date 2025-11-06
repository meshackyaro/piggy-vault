/**
 * Price Update Notification Component
 * Shows subtle notifications when STX price updates significantly
 */

'use client';

import { useState, useEffect } from 'react';
import { useSTXPrice } from '@/hooks/use-stx-price';

interface PriceUpdateNotificationProps {
  threshold?: number; // Percentage change threshold to show notification
  duration?: number; // How long to show notification (ms)
}

export default function PriceUpdateNotification({ 
  threshold = 2, // 2% change threshold
  duration = 5000 // 5 seconds
}: PriceUpdateNotificationProps) {
  const { stxPrice, formatUSDPrice } = useSTXPrice();
  
  const [previousPrice, setPreviousPrice] = useState<number>(0);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'increase' | 'decrease';
    change: number;
    newPrice: number;
  } | null>(null);

  useEffect(() => {
    if (stxPrice > 0 && previousPrice > 0) {
      const changePercent = ((stxPrice - previousPrice) / previousPrice) * 100;
      
      if (Math.abs(changePercent) >= threshold) {
        setNotification({
          show: true,
          type: changePercent > 0 ? 'increase' : 'decrease',
          change: Math.abs(changePercent),
          newPrice: stxPrice,
        });

        // Auto-hide notification after duration
        const timer = setTimeout(() => {
          setNotification(prev => prev ? { ...prev, show: false } : null);
        }, duration);

        return () => clearTimeout(timer);
      }
    }
    
    if (stxPrice > 0) {
      setPreviousPrice(stxPrice);
    }
  }, [stxPrice, previousPrice, threshold, duration]);

  if (!notification || !notification.show) {
    return null;
  }

  const isIncrease = notification.type === 'increase';

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm transform transition-all duration-500 ${
      notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`rounded-lg shadow-lg p-4 border-l-4 ${
        isIncrease 
          ? 'bg-green-50 border-green-400' 
          : 'bg-red-50 border-red-400'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-lg">
              {isIncrease ? '📈' : '📉'}
            </span>
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${
              isIncrease ? 'text-green-800' : 'text-red-800'
            }`}>
              STX Price {isIncrease ? 'Increased' : 'Decreased'}
            </h3>
            <div className={`mt-1 text-sm ${
              isIncrease ? 'text-green-700' : 'text-red-700'
            }`}>
              <p>
                {isIncrease ? '+' : '-'}{notification.change.toFixed(2)}% to {formatUSDPrice(notification.newPrice)}
              </p>
              <p className="text-xs mt-1 opacity-75">
                Minimum deposit may have changed
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotification(prev => prev ? { ...prev, show: false } : null)}
            className={`ml-2 text-sm ${
              isIncrease ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
            }`}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}