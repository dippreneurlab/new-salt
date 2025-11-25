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

let authInstance: Auth | null = null;

export function getClientAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth can only be used on the client");
  }

  if (authInstance) return authInstance;

  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(
      `Firebase client config missing: ${missing.join(
        ", "
      )}. Populate NEXT_PUBLIC_* variables in the browser runtime.`
    );
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  return authInstance;
}
