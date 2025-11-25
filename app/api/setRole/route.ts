import { NextResponse } from 'next/server';
import { setUserRole, verifyFirebaseToken } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyFirebaseToken(token);
    const callerRole = decoded.role;
    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (err) {
    console.error('Role check failed', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { uid, role } = body || {};
  if (!uid || !role) {
    return NextResponse.json({ error: 'uid and role are required' }, { status: 400 });
  }

  try {
    await setUserRole(uid, role);
    return NextResponse.json({ ok: true, uid, role });
  } catch (err) {
    console.error('Failed to set role', err);
    return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
  }
}
