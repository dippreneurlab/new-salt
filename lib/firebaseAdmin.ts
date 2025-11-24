import { App, applicationDefault, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Expect FB_* / FB_ADMIN_* naming
const projectId = process.env.FB_PROJECT_ID || process.env.NEXT_PUBLIC_FB_PROJECT_ID;
const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FB_ADMIN_CLIENT_EMAIL;
const privateKey = (process.env.FB_PRIVATE_KEY || process.env.FB_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, '\n');

let adminApp: App | null = null;

export const getFirebaseAdminApp = (): App | null => {
  if (adminApp) return adminApp;

  const credential =
    projectId && clientEmail && privateKey
      ? cert({
          projectId,
          clientEmail,
          privateKey
        })
      : applicationDefault();

  // If no explicit project is provided, let the default credentials supply it.
  const appOptions = projectId ? { credential, projectId } : { credential };

  adminApp = getApps().length ? getApp() : initializeApp(appOptions);

  return adminApp;
};

export const verifyFirebaseToken = async (idToken: string) => {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error('Firebase admin SDK is not initialized');
  }

  return getAuth(app).verifyIdToken(idToken);
};
