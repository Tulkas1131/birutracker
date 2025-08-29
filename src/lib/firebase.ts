
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore/lite";
import { getAuth, type Auth, browserSessionPersistence, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  "projectId": "kegtrack-mobile",
  "appId": "1:603063434971:web:066b_d3952ee869b2756fe",
  "storageBucket": "kegtrack-mobile.firebasestorage.app",
  "apiKey": "AIzaSyCzSAYX-rTIQeGz1MREn2OWOIVJ8_9yE90",
  "authDomain": "kegtrack-mobile.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "603063434971"
};

// Initialize Firebase App
let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// Lazy initialization for Firestore and Auth
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

const db = (): Firestore => {
    if (!firestoreInstance) {
        firestoreInstance = getFirestore(app);
    }
    return firestoreInstance;
};

const auth = (): Auth => {
    if (!authInstance) {
        authInstance = getAuth(app);
        // We handle persistence in AuthProvider to ensure it runs only on the client
        // and doesn't block server rendering or initial page load.
        setPersistence(authInstance, browserSessionPersistence)
          .catch((error) => {
            console.error("Error setting auth persistence:", error);
          });
    }
    return authInstance;
};

export { app, db, auth };
