// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD6HMGMtyUmCRzOdPLJoyp8gO5U6-c8o6M",
  authDomain: "lecture-assistant-ab472.firebaseapp.com",
  projectId: "lecture-assistant-ab472",
  storageBucket: "lecture-assistant-ab472.firebasestorage.app",
  messagingSenderId: "837593891010",
  appId: "1:837593891010:web:eacd0544a573177d7b7b5b",
  measurementId: "G-02DHGN3LE7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

// Initialize Firebase Auth
const auth = getAuth(app);

// Configure Google Auth Provider with additional scopes
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account' // Force account selection
});

// Initialize Firestore
const db = getFirestore(app);

export { app, analytics, auth, googleProvider, db };

