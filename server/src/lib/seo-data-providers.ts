export const hasGSCConfig = false;
export const hasSerpApi = false;

async function safeGetJson(url: string, headers?: Record<string, string>): Promise<any> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json", ...(headers || {}) } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

export async function fetchSearchConsoleData() {
  if (!hasGSCConfig) return null;
  // TODO: OAuth + Search Analytics request
  return null;
}

export async function fetchSerpRankings(keyword: string, location = "US") {
  if (!hasSerpApi) return null;
  // TODO: SerpAPI/SERPStack/Zenserp call
  return null;
}

export async function fetchBacklinksPage(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  return html;
}
