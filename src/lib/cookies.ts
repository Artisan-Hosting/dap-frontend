const COOKIE_NAME = 'artisan-dap-run-history';
const COOKIE_EXPIRY_DAYS = 30;

export interface RunHistoryEntry {
  runId: string;
  target: string;
  timestamp: number;
  cacheHit: boolean;
  done: boolean;
}

function getCookieExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + COOKIE_EXPIRY_DAYS);
  return date.toUTCString();
}

export function saveRunHistory(entries: RunHistoryEntry[]): void {
  try {
    const json = JSON.stringify(entries);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(json)}; expires=${getCookieExpiry()}; path=/`;
  } catch (err) {
    console.error('Failed to save run history:', err);
  }
}

export function loadRunHistory(): RunHistoryEntry[] {
  try {
    const cookies = document.cookie.split('; ');
    const runHistoryCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    
    if (!runHistoryCookie) return [];
    
    const json = decodeURIComponent(runHistoryCookie.split('=')[1]);
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to load run history:', err);
    return [];
  }
}

export function addRunToHistory(entry: RunHistoryEntry): RunHistoryEntry[] {
  const history = loadRunHistory();
  const updated = [entry, ...history].slice(0, 50);
  saveRunHistory(updated);
  return updated;
}

export function clearRunHistory(): void {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}
