
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useUserRole() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const authInstance = auth();
    const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const firestore = db(); // CORRECTO: Obtener la instancia de Firestore aquí.
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
