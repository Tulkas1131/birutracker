
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore/lite";
import { getAuth, type Auth, browserSessionPersistence, setPersistence } from "firebase/auth";

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

const db = (): Firestore => getFirestore(app);
const auth = (): Auth => getAuth(app);

// Set persistence on the client-side via AuthProvider
const initializeAuth = () => {
  const authInstance = auth();
  setPersistence(authInstance, browserSessionPersistence).catch((error) => {
    console.error("Error setting auth persistence:", error);
  });
};


export { app, db, auth, initializeAuth };
