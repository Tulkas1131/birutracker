
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
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
    const fetchUserRole = async () => {
      if (user) {
        const { doc, getDoc } = await import('firebase/firestore/lite');
        const firestore = db();
        const userDocRef = doc(firestore, "users", user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setUserRole(docSnap.data().role || "Operador");
          } else {
            setUserRole("Operador"); // Default role if doc doesn't exist
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole("Operador"); // Default on error
        }
      } else {
        setUserRole(null);
      }
    };
    fetchUserRole();
  }, [user]);

  return userRole;
}

    