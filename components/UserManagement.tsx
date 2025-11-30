'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import BrandedHeader from './BrandedHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { authFetch } from '@/lib/authFetch';
import { Loader2, RefreshCcw, ShieldCheck, Trash, UserPlus } from 'lucide-react';
import { getClientAuth } from '@/lib/firebaseClient';

type Role = 'admin' | 'pm' | 'user';

interface ManagedUser {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: Role;
  disabled: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface UserManagementProps {
  user: { email: string; name: string; role: Role };
  onLogout: () => void;
  onBackToHub: () => void;
}

const emailPattern = /^[^\s@]+@ilovesalt\.com$/i;

const formatDate = (value?: string | null) => {
  if (!value) return 'Never';
  const date = new Date(value);
  return isNaN(date.getTime()) ? 'Never' : date.toLocaleString();
};

export default function UserManagement({ user, onLogout, onBackToHub }: UserManagementProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'user' as Role,
    phoneNumber: ''
  });

  const currentUid = useMemo(() => {
    try {
      return getClientAuth().currentUser?.uid || null;
    } catch {
      return null;
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await authFetch('/api/users', { cache: 'no-store' });
      if (!res.ok) {
        let message = 'Failed to load users';
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user.role === 'admin') {
      loadUsers();
    }
  }, [loadUsers, user.role]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (user.role !== 'admin') {
      setError('Only administrators can create new users.');
      return;
    }

    if (!emailPattern.test(form.email)) {
      setError('Email must be a valid @ilovesalt.com address.');
      return;
    }

    if (!form.password || form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!form.displayName.trim()) {
      setError('Name is required.');
      return;
    }

    setCreating(true);

    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Unable to create user');
      }

      const data = await res.json();
      setUsers((prev) => [data.user, ...prev]);
      setForm({ displayName: '', email: '', password: '', role: 'user', phoneNumber: '' });
      setSuccess('User created');
    } catch (err) {
      console.error('Create user failed', err);
      setError(err instanceof Error ? err.message : 'Unable to create user');
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (uid: string, role: Role) => {
    setSavingUserId(uid);
    setError('');
    setSuccess('');

    try {
      const res = await authFetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Unable to update role');
      }

      const data = await res.json();
      setUsers((prev) => prev.map((u) => (u.uid === uid ? data.user : u)));
      setSuccess('Role updated');
    } catch (err) {
      console.error('Update role failed', err);
      setError(err instanceof Error ? err.message : 'Unable to update role');
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteUser = async (uid: string) => {
    if (uid === currentUid) {
      setError('You cannot delete the account you are currently using.');
      return;
    }

    const confirmed = window.confirm('Delete this user?');
    if (!confirmed) return;

    setDeleteTarget(uid);
    setError('');
    setSuccess('');

    try {
      const res = await authFetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Unable to delete user');
      }

      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setSuccess('User deleted');
    } catch (err) {
      console.error('Delete user failed', err);
      setError(err instanceof Error ? err.message : 'Unable to delete user');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <BrandedHeader
          user={user}
          onLogout={onLogout}
          showBackButton
          onBackClick={onBackToHub}
          title="User Management"
          backLabel="← Salt XC Hub"
        />
        <div className="max-w-3xl mx-auto px-6 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Restricted</CardTitle>
              <CardDescription>Only admins can access user management.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <p className="text-sm text-gray-600">Switch to an admin account to manage users.</p>
              <Button onClick={onBackToHub} variant="outline">Back to Hub</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BrandedHeader
        user={user}
        onLogout={onLogout}
        showBackButton
        onBackClick={onBackToHub}
        title="User Management"
        backLabel="← Salt XC Hub"
      />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600">
              Only @ilovesalt.com emails can be created.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Badge variant="secondary" className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              Admin only
            </Badge>
          </div>
        </div>

        {(error || success) && (
          <div className="space-y-2">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Create User
              </CardTitle>
              <CardDescription>
                Admins can add new accounts directly with a Salt email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateUser}>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Name</Label>
                  <Input
                    id="displayName"
                    value={form.displayName}
                    onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    placeholder="First Last"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Salt Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value.trim() }))}
                    placeholder="you@ilovesalt.com"
                  />
                  <p className="text-xs text-gray-500">Email must include "ilovesalt.com".</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone (optional)</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="+1 416 555 1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, role: val as Role }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="pm">Project Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Existing Users</CardTitle>
              <CardDescription>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-gray-600">No users found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Last Login</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {users.map((item) => (
                        <tr key={item.uid} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{item.displayName || '—'}</div>
                            <div className="text-xs text-gray-500">{item.phoneNumber || 'No phone'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.email}</td>
                          <td className="px-4 py-3">
                            <Select
                              value={item.role}
                              onValueChange={(val) => updateRole(item.uid, val as Role)}
                              disabled={savingUserId === item.uid}
                            >
                              <SelectTrigger size="sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="pm">Project Manager</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.lastLogin)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{formatDate(item.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => deleteUser(item.uid)}
                              disabled={deleteTarget === item.uid}
                            >
                              {deleteTarget === item.uid ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
