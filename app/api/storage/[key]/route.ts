import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { deleteStorageValue, getStorageValue, setStorageValue } from '@/lib/cloudStorageServer';

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Next type-checker wants params to be awaited; declare as Promise to satisfy ParamCheck
type RouteContext = { params: Promise<{ key: string }> };

const resolveParams = async (context: RouteContext) => {
  // If params is already a plain object, await will just return it.
  return await context.params;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = await resolveParams(context);
  const key = params.key;
  const value = await getStorageValue(user.uid, key);
  return NextResponse.json({ key, value });
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = await resolveParams(context);
  const key = params.key;
  const body = await request.json();
  const value = body?.value ?? null;
  const saved = await setStorageValue(user.uid, key, value, user.email);
  return NextResponse.json({ key, value: saved });
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = await resolveParams(context);
  const key = params.key;
  await deleteStorageValue(user.uid, key);
  return NextResponse.json({ ok: true });
}
