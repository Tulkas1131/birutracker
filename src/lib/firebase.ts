
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore/lite";
import { getAuth, type Auth, browserSessionPersistence, setPersistence } from "firebase/auth";

// Your web app's Firebase configuration - KEEP THIS UPDATED
const firebaseConfig = {
  "projectId": "kegtrack-mobile",
  "appId": "1:603063434971:web:066b_d3952ee869b2756fe",
  "storageBucket": "kegtrack-mobile.firebasestorage.app",
  "apiKey": "AIzaSyCzSAYX-rTIQeGz1MREn2OWOIVJ8_9yE90",
  "authDomain": "kegtrack-mobile.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "603063434971"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db: () => Firestore = () => getFirestore(app);
const authInstance: Auth = getAuth(app);

// Set auth persistence to browser session on the client side
if (typeof window !== 'undefined') {
    setPersistence(authInstance, browserSessionPersistence);
}

const auth = () => authInstance;

export { app, db, auth };
