import { buildApiUrl } from './apiBase';

export type PipelineMetadata = {
  clients: string[];
  rateCardMap: Record<string, string>;
  clientCategoryMap: Record<string, string>;
};

let cachedMetadata: PipelineMetadata | null = null;

export const fetchPipelineMetadata = async (): Promise<PipelineMetadata> => {
  if (cachedMetadata) return cachedMetadata;
  const res = await fetch(buildApiUrl('/api/metadata/pipeline'));
  if (!res.ok) {
    throw new Error(`Failed to load pipeline metadata (${res.status})`);
  }
  const data = (await res.json()) as PipelineMetadata;
  cachedMetadata = data;
  return data;
};

export const getCachedPipelineMetadata = () => cachedMetadata;
