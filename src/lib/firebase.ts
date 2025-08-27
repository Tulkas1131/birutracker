
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

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
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let db: Firestore;
let auth: Auth;

// Dynamically get Firestore instance
const getDb = () => {
  if (!db) {
    db = getFirestore(app);
  }
  return db;
};

// Dynamically get Auth instance
const getAuthInstance = () => {
  if (!auth) {
    auth = getAuth(app);
  }
  return auth;
};

// Re-exporting them as 'db' and 'auth' so we don't need to refactor the whole app
export { app, getDb as db, getAuthInstance as auth };
