'use client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import AppClient from './AppClient';

export default function Page() {
  return <AppClient />;
}
