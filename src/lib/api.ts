import type {
  CreateRunRequest,
  CreateRunResponse,
  RunStatusResponse,
  RunResultsResponse,
  CanonicalReportResponse,
  SupportedTestsResponse,
  RunState,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'http://127.0.0.1:3000');

const TERMINAL_RUN_STATES: Set<RunState> = new Set([
  'completed',
  'failed',
  'cache_hit',
  'canceled',
]);

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timeout?: number;
}

class ApiError extends Error {
  statusCode: number;
  url: string;
  body: unknown;

  constructor(statusCode: number, url: string, body: unknown) {
    super(`HTTP ${statusCode} for ${url}`);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.url = url;
    this.body = body;
  }
}

async function requestJson<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, timeout = 30000 } = options;

  const headers: Record<string, string> = {
    accept: 'application/json',
  };

  let data: string | undefined;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    data = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new ApiError(response.status, url, parsed);
    }

    return parsed as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, url, { message: (err as Error).message });
  }
}

export async function listSupportedTests(): Promise<SupportedTestsResponse> {
  return requestJson<SupportedTestsResponse>(`${API_BASE_URL}/v1/tests`);
}

export async function createRun(request: CreateRunRequest): Promise<CreateRunResponse> {
  const status = requestJson<CreateRunResponse>(`${API_BASE_URL}/v1/runs`, {
    method: 'POST',
    body: request,
  });
  return status;
}

export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  return requestJson<RunStatusResponse>(`${API_BASE_URL}/v1/runs/${runId}`);
}

export async function getRunResults(runId: string): Promise<RunResultsResponse> {
  return requestJson<RunResultsResponse>(`${API_BASE_URL}/v1/runs/${runId}/results`);
}

export async function getRunReport(runId: string): Promise<CanonicalReportResponse> {
  return requestJson<CanonicalReportResponse>(`${API_BASE_URL}/v1/runs/${runId}/report`);
}

export function isTerminalState(state: RunState): boolean {
  return TERMINAL_RUN_STATES.has(state);
}

export const POLL_INTERVAL_MS = 2000;
export const DEFAULT_TIMEOUT_MS = 600000;

export { API_BASE_URL, TERMINAL_RUN_STATES };
export default ApiError;