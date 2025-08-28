
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Asset, Customer } from '@/lib/types';

interface DataContextType {
  assets: Asset[];
  customers: Customer[];
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const firestore = db();
    
    // Subscribe to assets
    const assetsQuery = query(collection(firestore, "assets"), orderBy("code"));
    const unsubscribeAssets = onSnapshot(assetsQuery, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetsData);
      if (isLoading) setIsLoading(false); // Set loading to false after first fetch
    }, (error) => {
      console.error("Error fetching assets: ", error);
      setIsLoading(false);
    });

    // Subscribe to customers
    const customersQuery = query(collection(firestore, "customers"), orderBy("name"));
    const unsubscribeCustomers = onSnapshot(customersQuery, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);
    }, (error) => {
      console.error("Error fetching customers: ", error);
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeAssets();
      unsubscribeCustomers();
    };
  }, [isLoading]);

  const value = { assets, customers, isLoading };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
