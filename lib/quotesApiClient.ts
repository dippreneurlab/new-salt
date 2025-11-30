'use client';

import { authFetch } from './authFetch';

export type QuoteDraftPayload = Record<string, any>;

const toJson = async (res: Response) => {
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Quote API error (${res.status}): ${detail || res.statusText}`);
  }
  return res.json();
};

export const fetchQuotes = async (): Promise<any[]> => {
  const res = await authFetch('/api/quotes', { cache: 'no-cache' });
  const payload = await toJson(res);
  return payload?.quotes || [];
};

export const fetchQuote = async (quoteId: string): Promise<any | null> => {
  const res = await authFetch(`/api/quotes/${encodeURIComponent(quoteId)}`, { cache: 'no-cache' });
  const payload = await toJson(res);
  return payload?.quote ?? null;
};

export const upsertQuoteDraft = async (quoteId: string, quote: QuoteDraftPayload): Promise<any> => {
  const res = await authFetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quote }),
  });
  const payload = await toJson(res);
  return payload?.quote ?? quote;
};
