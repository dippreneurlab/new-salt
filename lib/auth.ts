import { verifyFirebaseToken } from './firebaseAdmin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role?: 'admin' | 'pm' | 'user';
}

export const getUserFromRequest = async (req: Request): Promise<AuthenticatedUser | null> => {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  if (!token) return null;

  try {
    const decoded = await verifyFirebaseToken(token);
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const role: 'admin' | 'pm' | 'user' =
      decoded.email && adminEmails.includes(decoded.email.toLowerCase()) ? 'admin' : 'user';
    return { uid: decoded.uid, email: decoded.email, role };
  } catch (error) {
    console.error('Failed to verify Firebase token', error);
    return null;
  }
};
