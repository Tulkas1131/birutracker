// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
