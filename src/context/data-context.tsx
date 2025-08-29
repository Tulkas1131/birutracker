
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore/lite';
import { onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore'; // Full SDK for real-time updates
import { db } from '@/lib/firebase';
import type { Asset, Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const firestore = db();
    try {
      // Fetch assets
      const assetsQuery = query(collection(firestore, "assets"), orderBy("code"));
      const assetsSnapshot = await getDocs(assetsQuery);
      const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetsData);

      // Fetch customers
      const customersQuery = query(collection(firestore, "customers"), orderBy("name"));
      const customersSnapshot = await getDocs(customersQuery);
      const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);

    } catch (error) {
      console.error("Error fetching initial data: ", error);
      toast({
        title: "Error de Carga",
        description: "No se pudieron cargar los datos iniciales.",
        variant: "destructive"
      });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
