
"use client";

import { useState, useEffect } from 'react';
import { auth, initializeAuth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';

// This provider ensures that we set the auth persistence only once
// and that we show a loading state while the initial auth check is happening.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This will run only once when the app mounts
    initializeAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Once we get the first response from Firebase auth, we are done loading.
      setLoading(false); 
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
