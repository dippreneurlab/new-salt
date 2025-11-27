const defaultRemote = "https://salthub-new-backend-628837369388.us-central1.run.app";
const defaultLocal = "http://localhost:5000";

const trimTrailingSlash = (value?: string, fallback?: string) =>
  (value || fallback || "").replace(/\/$/, "");

const remoteBase = trimTrailingSlash(
  process.env.NEXT_PUBLIC_BACKEND_REMOTE_URL,
  process.env.NEXT_PUBLIC_API_BASE_URL || defaultRemote
);

const localBase = trimTrailingSlash(
  process.env.NEXT_PUBLIC_BACKEND_LOCAL_URL,
  defaultLocal
);

const shouldUseLocal = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }
  return process.env.NODE_ENV === "development";
};

export const getApiBase = () => (shouldUseLocal() ? localBase : remoteBase);

export const buildApiUrl = (path: string) => {
  const base = getApiBase();
  if (path.startsWith("http")) return path;
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
};
