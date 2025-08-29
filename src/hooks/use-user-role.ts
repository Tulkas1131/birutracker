
"use client";

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore/lite';
import { auth, db } from '@/lib/firebase';

export function useUserRole() {
  const [user] = useAuthState(auth());
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const firestore = db();
      const userDocRef = doc(firestore, "users", user.uid);
      getDoc(userDocRef).then((doc) => {
        if (doc.exists()) {
          setUserRole(doc.data().role || "Operador");
        }
      });
    } else {
      setUserRole(null);
    }
  }, [user]);

  return userRole;
}
