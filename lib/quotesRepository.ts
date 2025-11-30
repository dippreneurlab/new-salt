import { query } from './db';

export const parseQuotesValue = (value: any): any[] => {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeDate = (input: any): string | null => {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const firstValue = (...values: any[]) => {
  for (const val of values) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'string' && val.trim() === '') continue;
    return val;
  }
  return null;
};

const ensureUser = async (userId: string, email?: string) => {
  const safeEmail = email || `${userId}@placeholder.local`;
  await query(
    `
      INSERT INTO users (id, email)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
    `,
    [userId, safeEmail]
  );
};

export const replaceQuotes = async (userId: string, quotes: any[], email?: string) => {
  await ensureUser(userId, email);
  for (const quote of quotes) {
    const project = quote.project || {};
    const projectNumber = firstValue(quote.projectNumber, project.projectNumber);
    const quoteUid: string = quote.id || `${projectNumber || 'quote'}-${userId}`;
    await query(
      `
        INSERT INTO quotes (
          quote_uid,
          project_number,
          client_name,
          client_category,
          brand,
          project_name,
          brief_date,
          in_market_date,
          project_completion_date,
          total_program_budget,
          rate_card,
          currency,
          phases,
          phase_settings,
          status,
          created_by,
          updated_by,
          full_quote
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
        )
        ON CONFLICT (quote_uid) DO UPDATE SET
          project_number = EXCLUDED.project_number,
          client_name = EXCLUDED.client_name,
          client_category = EXCLUDED.client_category,
          brand = EXCLUDED.brand,
          project_name = EXCLUDED.project_name,
          brief_date = EXCLUDED.brief_date,
          in_market_date = EXCLUDED.in_market_date,
          project_completion_date = EXCLUDED.project_completion_date,
          total_program_budget = EXCLUDED.total_program_budget,
          rate_card = EXCLUDED.rate_card,
          currency = EXCLUDED.currency,
          phases = EXCLUDED.phases,
          phase_settings = EXCLUDED.phase_settings,
          status = EXCLUDED.status,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by,
          full_quote = EXCLUDED.full_quote
      `,
      [
        quoteUid,
        projectNumber,
        firstValue(quote.clientName, project.clientName),
        firstValue(project.clientCategory, quote.clientCategory),
        firstValue(quote.brand, project.brand),
        firstValue(quote.projectName, project.projectName),
        normalizeDate(firstValue(project.briefDate, quote.briefDate)),
        normalizeDate(firstValue(project.inMarketDate, quote.inMarketDate)),
        normalizeDate(firstValue(project.projectCompletionDate, quote.projectCompletionDate)),
        firstValue(project.totalProgramBudget, quote.totalRevenue),
        firstValue(project.rateCard, quote.rateCard),
        firstValue(quote.currency, project.currency, 'CAD'),
        project.phases ?? [],
        project.phaseSettings ?? {},
        quote.status || 'draft',
        userId,
        userId,
        quote
      ]
    );
  }

  const ids = quotes.map(q => q.id || `${(q.projectNumber || (q.project || {}).projectNumber || 'quote')}-${userId}`).filter(Boolean);
  if (ids.length) {
    await query(
      `DELETE FROM quotes WHERE created_by = $1 AND quote_uid IS NOT NULL AND quote_uid NOT IN (${ids
        .map((_, i) => `$${i + 2}`)
        .join(',')})`,
      [userId, ...ids]
    );
  } else {
    await query('DELETE FROM quotes WHERE created_by = $1', [userId]);
  }
};

export const getQuotesForUser = async (userId: string): Promise<any[]> => {
  const res = await query(
    `
      SELECT full_quote FROM quotes
      WHERE created_by = $1 OR updated_by = $1
      ORDER BY updated_at DESC
    `,
    [userId]
  );
  return res.rows.map(r => r.full_quote || {});
};
