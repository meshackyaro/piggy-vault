/**
 * Dark Theme Provider - Ensures consistent dark theme across the application
 */

'use client';

import { createContext, useContext, useEffect } from 'react';

interface ThemeContextType {
  theme: 'dark';
  isDark: true;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Apply dark theme to document on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      // Remove any existing theme classes and ensure dark mode
      root.classList.remove('light', 'system');
      root.classList.add('dark');
      
      // Clean up any old theme preferences
      localStorage.removeItem('theme-preference');
    }
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme: 'dark',
      isDark: true,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}