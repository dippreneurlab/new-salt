'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { authFetch } from '@/lib/authFetch';
import { getClientAuth } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';

type Role = 'admin' | 'pm' | 'user';

interface ManagedUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
}

export default function AdminUpgradePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getClientAuth>['currentUser'] | null>(null);
  const hasAutoRun = useRef(false);

  useEffect(() => {
    try {
      const auth = getClientAuth();
      const unsubscribe = auth.onAuthStateChanged((u) => {
        setCurrentUser(u);
        setAuthReady(true);
      });
      return () => unsubscribe();
    } catch {
      setAuthReady(true);
      setCurrentUser(null);
    }
  }, []);

  const addLog = (message: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);

  const upgradeAll = async () => {
    setRunning(true);
    setError(null);
    setDone(false);
    setSummary('');
    setLogs([]);

    if (!authReady) {
      setError('Auth not ready yet. Please wait a moment.');
      setRunning(false);
      return;
    }

    if (!currentUser) {
      setError('No signed-in user. Please log in first.');
      setRunning(false);
      return;
    }

    addLog('Fetching users from /api/users…');
    let users: ManagedUser[] = [];

    try {
      const res = await authFetch('/api/users', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to load users (${res.status})`);
      }
      const data = await res.json();
      users = data.users || [];
      addLog(`Loaded ${users.length} users.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load users.';
      setError(message);
      addLog(`Error: ${message}`);
      setRunning(false);
      return;
    }

    const toUpgrade = users.filter((u) => u.role !== 'admin');
    if (toUpgrade.length === 0) {
      addLog('All users are already admins. Nothing to do.');
      setSummary('All users are already admins.');
      setDone(true);
      setRunning(false);
      return;
    }

    addLog(`Upgrading ${toUpgrade.length} users to admin…`);
    let successCount = 0;
    let failureCount = 0;

    for (const user of toUpgrade) {
      addLog(`→ Setting ${user.email || user.uid} to admin…`);
      try {
        const res = await authFetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, role: 'admin' })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Failed (${res.status})`);
        }
        successCount += 1;
        addLog(`✔ Updated ${user.email || user.uid}`);
      } catch (err) {
        failureCount += 1;
        const message = err instanceof Error ? err.message : 'Unknown error';
        addLog(`✖ Failed for ${user.email || user.uid}: ${message}`);
      }
    }

    setSummary(`Completed. Admins created/updated: ${successCount}. Failures: ${failureCount}.`);
    setDone(true);
    setRunning(false);
  };

  useEffect(() => {
    if (authReady && currentUser && !hasAutoRun.current) {
      hasAutoRun.current = true;
      upgradeAll();
    }
  }, [authReady, currentUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Temporary Admin Upgrade</CardTitle>
              <p className="text-sm text-gray-600">
                Visits to this page will set every Firebase Auth user to admin via /api/users.
                Remove this page after use.
              </p>
            </div>
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button onClick={upgradeAll} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running…
                  </>
                ) : (
                  'Run again'
                )}
              </Button>
              {done && (
                <span className="text-sm text-green-700 font-medium">
                  Admins have been created/updated.
                </span>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {summary && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                {summary}
              </div>
            )}

            <div className="rounded-md border border-gray-200 bg-white p-3 h-72 overflow-auto text-sm text-gray-800">
              {logs.length === 0 ? (
                <p className="text-gray-500">Waiting for logs…</p>
              ) : (
                logs.map((line, idx) => <div key={idx}>{line}</div>)
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
