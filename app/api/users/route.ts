import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const requireAdmin = async (request: Request) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
};

const buildUserPayload = (record: Awaited<ReturnType<ReturnType<typeof getAdminAuth>['getUser']>>) => ({
  uid: record.uid,
  email: record.email || '',
  displayName: record.displayName || '',
  phoneNumber: record.phoneNumber || '',
  role: (record.customClaims?.role as string) || 'user',
  disabled: record.disabled,
  createdAt: record.metadata.creationTime,
  lastLogin: record.metadata.lastSignInTime,
});

export async function GET(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const auth = getAdminAuth();
  const users: ReturnType<typeof buildUserPayload>[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const result = await auth.listUsers(1000, pageToken);
      result.users.forEach((record) => users.push(buildUserPayload(record)));
      pageToken = result.pageToken;
    } while (pageToken);

    return NextResponse.json({ users });
  } catch (err) {
    console.error('Failed to list Firebase users', err);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const auth = getAdminAuth();
  const body = await request.json().catch(() => null);
  const { email, password, displayName, role = 'user', phoneNumber } = body || {};

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const emailPattern = /^[^\s@]+@ilovesalt\.com$/i;
  if (!emailPattern.test(email)) {
    return NextResponse.json({ error: 'Email must be a valid @ilovesalt.com address' }, { status: 400 });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  if (!['admin', 'pm', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Role must be admin, pm, or user' }, { status: 400 });
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      phoneNumber,
      emailVerified: true,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role });
    const createdUser = await auth.getUser(userRecord.uid);

    return NextResponse.json({ user: buildUserPayload(createdUser) }, { status: 201 });
  } catch (err) {
    console.error('Failed to create Firebase user', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const auth = getAdminAuth();
  const body = await request.json().catch(() => null);
  const { uid, role } = body || {};

  if (!uid || !role) {
    return NextResponse.json({ error: 'uid and role are required' }, { status: 400 });
  }

  if (!['admin', 'pm', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const record = await auth.getUser(uid);
    const existingClaims = record.customClaims || {};
    await auth.setCustomUserClaims(uid, { ...existingClaims, role });
    const updated = await auth.getUser(uid);

    return NextResponse.json({ user: buildUserPayload(updated) });
  } catch (err) {
    console.error('Failed to update Firebase user role', err);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const auth = getAdminAuth();
  const body = await request.json().catch(() => null);
  const { uid } = body || {};

  if (!uid) {
    return NextResponse.json({ error: 'uid is required' }, { status: 400 });
  }

  try {
    await auth.deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete Firebase user', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
