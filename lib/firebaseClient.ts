'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FB_APP_ID || "",
} as const;

// Initialize the app once per browser session
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Safe client-only getter.
 * Always returns a concrete Auth
 * and throws if called on the server.
 */
export function getClientAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth can only be used on the client");
  }
  return getAuth(app);
}
