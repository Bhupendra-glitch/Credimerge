import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCNRJPdieCa4D39VIrxWGO1eb1QHrqpWtU",
  authDomain: "credimerge.firebaseapp.com",
  projectId: "credimerge",
  storageBucket: "credimerge.firebasestorage.app",
  messagingSenderId: "277434018967",
  appId: "1:277434018967:web:1d8fb402e7aeb2919b8dd2",
  measurementId: "G-82J7KSV0BR",
};

// Initialize Firebase app
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics safely
export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && (await isSupported())) {
    return getAnalytics(app);
  }
  return null;
};

// Auth helper methods
export async function signInWithGooglePopup() {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, googleProvider);
}

export async function loginWithFirebase(email: string, pass: string) {
  return signInWithEmailAndPassword(auth, email, pass);
}

export async function signupWithFirebase(email: string, pass: string) {
  return createUserWithEmailAndPassword(auth, email, pass);
}

export async function logoutFirebase() {
  return signOut(auth);
}
