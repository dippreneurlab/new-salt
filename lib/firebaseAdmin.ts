// lib/firebaseAdmin.ts

import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";

function buildServiceAccount(): ServiceAccount | null {
  // Support either server-only or NEXT_PUBLIC project id envs (user requested NEXT_PUBLIC_FB_PROJECT_ID).
  const projectId = process.env.FB_PROJECT_ID || process.env.NEXT_PUBLIC_FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  let privateKey = process.env.FB_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/^"|"$/g, "")
      .trim();
  }

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

let adminAuthInstance: Auth | null = null;

function initAdminApp(): Auth {
  if (adminAuthInstance) return adminAuthInstance;

  const serviceAccount = buildServiceAccount();

  try {
    const app =
      getApps().length > 0
        ? getApp()
        : serviceAccount && serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey
        ? initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.projectId,
          })
        : initializeApp({ credential: applicationDefault() });

    adminAuthInstance = getAuth(app);
    return adminAuthInstance;
  } catch (err) {
    console.error("Failed to initialize Firebase Admin SDK", err);
    throw err;
  }
}

export const getAdminAuth = () => initAdminApp();

export async function verifyFirebaseToken(token: string): Promise<DecodedIdToken> {
  const auth = getAdminAuth();
  return auth.verifyIdToken(token);
}

export async function setUserRole(uid: string, role: string) {
  const auth = getAdminAuth();
  await auth.setCustomUserClaims(uid, { role });
}
