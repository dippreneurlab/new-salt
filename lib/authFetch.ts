// Client-only helper for authenticated fetch calls.
'use client';

import { getClientAuth } from './firebaseClient';
import { getApiBase } from './apiBase';

const resolveUrl = (input: RequestInfo | URL): RequestInfo | URL => {
  const apiBase = getApiBase();
  if (typeof input === 'string' && input.startsWith('/') && apiBase) {
    return `${apiBase}${input}`;
  }
  return input;
};

/**
 * Adds the current Firebase ID token as an Authorization header
 * before forwarding the request to fetch. Throws if the user
 * is not authenticated.
 */
export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const auth = getClientAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(resolveUrl(input), { ...init, headers });
};
