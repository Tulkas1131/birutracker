
import * as React from "react";
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from "@/lib/firebase/admin";
import { DashboardLayoutContent } from "./layout-client";

async function getUserData(uid: string) {
  try {
    const auth = getAuth(adminApp);
    const firestore = getFirestore(adminApp);
    
    const [userRecord, userDoc] = await Promise.all([
      auth.getUser(uid),
      firestore.collection('users').doc(uid).get()
    ]);
    
    let role = 'Operador';
    if (userDoc.exists) {
      role = userDoc.data()?.role || 'Operador';
    }

    return {
      email: userRecord.email,
      photoURL: userRecord.photoURL,
      role: role,
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    // Return null or default values if user data can't be fetched
    // This might happen if the user was deleted from Auth but the cookie remains
    return null;
  }
}


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    // Redirect if no session cookie is found
    redirect('/');
  }

  try {
    const decodedIdToken = await getAuth(adminApp).verifySessionCookie(sessionCookie, true);
    const userData = await getUserData(decodedIdToken.uid);

    if (!userData) {
        // If user data is null (e.g., user deleted), treat as unauthenticated
        redirect('/');
    }

    return (
        <DashboardLayoutContent user={userData}>{children}</DashboardLayoutContent>
    );
  } catch (error) {
    console.error("Session cookie verification failed:", error);
    // Redirect if the cookie is invalid
    redirect('/');
  }
}
