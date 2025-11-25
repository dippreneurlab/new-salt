// lib/firebaseAdmin.ts

import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";

// Detect Next.js build phase — NEVER initialize Admin during build
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.CI === "true";

// --- Build service account safely ---
function buildServiceAccount(): ServiceAccount | null {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  let privateKey = process.env.FB_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) return null;

  // Normalize PEM
  privateKey = privateKey
    .replace(/^"|"$/g, "")       // remove surrounding quotes
    .replace(/\\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  // Ensure BEGIN/END exist
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
  }

  return { projectId, clientEmail, privateKey };
}

// Cached instance (avoid multiple initializations)
let adminAuthInstance: Auth | null = null;

// --- Initialize Admin SDK safely ---
function initAdminAuth(): Auth | null {
  if (adminAuthInstance) return adminAuthInstance;

  // Prevent Firebase Admin initialization during Docker/Next.js build
  if (isBuildPhase) {
    console.warn("⚠️ Firebase Admin initialization skipped during build.");
    return null;
  }

  const serviceAccount = buildServiceAccount();
  try {
    const app =
      getApps().length > 0
        ? getApp()
        : serviceAccount
        ? initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.projectId,
          })
        : initializeApp({ credential: applicationDefault() });

    adminAuthInstance = getAuth(app);
    return adminAuthInstance;
  } catch (err) {
    console.error("❌ Failed to initialize Firebase Admin SDK", err);
    return null; // IMPORTANT: do NOT throw — avoids breaking Next build
  }
}

// Export lazy loader
export const getAdminAuth = (): Auth | null => initAdminAuth();

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export async function verifyFirebaseToken(
  token: string
): Promise<DecodedIdToken | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  return auth.verifyIdToken(token);
}

export async function setUserRole(uid: string, role: string) {
  const auth = getAdminAuth();
  if (!auth) throw new Error("Admin SDK unavailable");
  await auth.setCustomUserClaims(uid, { role });
}
