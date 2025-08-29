
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore/lite';
import { auth, db } from '@/lib/firebase';

export function useUserRole() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const firestore = db();
      const userDocRef = doc(firestore, "users", user.uid);
      getDoc(userDocRef).then((doc) => {
        if (doc.exists()) {
          setUserRole(doc.data().role || "Operador");
        } else {
            setUserRole("Operador"); // Default role if doc doesn't exist
        }
      }).catch(() => setUserRole("Operador")); // Default on error
    } else {
      setUserRole(null);
    }
  }, [user]);

  return userRole;
}
