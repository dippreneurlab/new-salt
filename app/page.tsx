'use client';
'use client';

export const dynamic = "force-dynamic";
export const revalidate = 0;

import AppClient from './AppClient';

export default function Page() {
  return <AppClient />;
}
