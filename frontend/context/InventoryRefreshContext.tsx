import React, { createContext, useContext, useCallback, ReactNode } from 'react';

interface InventoryRefreshContextType {
  triggerRefresh: () => void;
  addRefreshListener: (callback: () => void) => () => void;
}

const InventoryRefreshContext = createContext<InventoryRefreshContextType | undefined>(undefined);

export function InventoryRefreshProvider({ children }: { children: ReactNode }) {
  const listeners = React.useRef<Set<() => void>>(new Set());

  const triggerRefresh = useCallback(() => {
    listeners.current.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in refresh listener:', error);
      }
    });
  }, []);

  const addRefreshListener = useCallback((callback: () => void) => {
    listeners.current.add(callback);
    
    return () => {
      listeners.current.delete(callback);
    };
  }, []);

  return (
    <InventoryRefreshContext.Provider value={{ triggerRefresh, addRefreshListener }}>
      {children}
    </InventoryRefreshContext.Provider>
  );
}

export function useInventoryRefresh() {
  const context = useContext(InventoryRefreshContext);
  if (context === undefined) {
    throw new Error('useInventoryRefresh must be used within an InventoryRefreshProvider');
  }
  return context;
}
