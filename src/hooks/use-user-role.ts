
"use client";

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export function useUserRole() {
  const [user] = useAuthState(auth);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserRole(doc.data().role || "Operador");
        }
      });
    } else {
      setUserRole(null);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  return userRole;
}

    