// Client-only Firebase initialization. Do not import from server components.
'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID,
} as const;

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

let appInstance: ReturnType<typeof initializeApp> | null = null;
let authInstance: Auth | null = null;

if (typeof window !== 'undefined') {
  if (missingKeys.length) {
    console.warn(
      `Firebase client config missing: ${missingKeys.join(
        ', '
      )}. Populate NEXT_PUBLIC_* variables in the browser runtime.`
    );
  } else {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
  }
}

export const firebaseApp = appInstance;
export const firebaseAuth = authInstance as Auth | null;
