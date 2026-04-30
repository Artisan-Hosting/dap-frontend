export type RunState = 
  | 'queued' 
  | 'cache_hit' 
  | 'discovering' 
  | 'planning' 
  | 'running' 
  | 'aggregating' 
  | 'completed' 
  | 'failed' 
  | 'canceled';

export type RequestedTestState = 
  | 'accepted' 
  | 'rejected_unsupported' 
  | 'rejected_not_applicable' 
  | 'expanded_to_planned_tests';

export type TestStatus = 'pass' | 'warn' | 'fail' | 'error' | 'info' | 'skipped';

export type TestSeverity = 'low' | 'medium' | 'high' | 'critical' | 'informational';

export interface SupportedTest {
  id: string;
  name: string;
  version: string;
  runtime: string;
  timeout_seconds: number;
  category: string;
}

export interface SupportedTestsResponse {
  tests: SupportedTest[];
}

export interface CreateRunRequest {
  target: string;
  requested_tests?: string[];
  force_refresh?: boolean;
  client_request_id?: string;
}

export interface CreateRunResponse {
  run_id: string;
  state: RunState;
  target: string;
}

export interface RequestedTestStatus {
  test_id: string;
  state: RequestedTestState;
  reason?: string | null;
}

export interface RunCounts {
  planned: number;
  completed: number;
  failed_to_start: number;
  rejected_not_applicable: number;
}

export interface RunStatusResponse {
  run_id: string;
  target: string;
  state: RunState;
  submitted_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  cache_hit: boolean;
  reused_from_run_id?: string | null;
  requested_tests: RequestedTestStatus[];
  counts: RunCounts;
}

export interface Artifact {
  artifact_id: string;
  run_id: string;
  result_id?: string | null;
  artifact_type: string;
  relative_path: string;
  content_type: string;
  size_bytes: number;
}

export type PluginJsonValue = Record<string, unknown> | null;

export interface Result {
  result_id: string;
  run_id: string;
  target: string;
  test_id: string;
  plugin_version: string;
  status: TestStatus;
  severity: TestSeverity;
  notes?: string | null;
  evidence: PluginJsonValue;
  recommendations: string[];
  artifacts: Artifact[];
}

export interface RunResultsResponse {
  run_id: string;
  requested_test_outcomes: RequestedTestStatus[];
  results: Result[];
}

export interface TargetRunSummary {
  run_id: string;
  target: string;
  state: RunState;
  submitted_at: string;
  completed_at?: string | null;
  cache_hit: boolean;
}

export interface TargetHistoryResponse {
  target: string;
  runs: TargetRunSummary[];
}

export interface ReportRun {
  run_id: string;
  target_input: string;
  target_key: string;
  state: RunState;
  submitted_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  cache_hit: boolean;
  reused_from_run_id?: string | null;
  force_refresh: boolean;
  client_request_id?: string | null;
  engine_version: string;
  rules_version: string;
  config_hash: string;
  error_message?: string | null;
}

export interface ResultStatusCounts {
  pass: number;
  warn: number;
  fail: number;
  error: number;
  info: number;
  skipped: number;
}

export interface ReportSummary {
  run_counts: RunCounts;
  result_counts: ResultStatusCounts;
}

export interface SiteProfile {
  host: string;
  kind: string;
  provider?: string | null;
  confidence: number;
  signals: string[];
}

export interface DeadHost {
  host: string;
  reason: string;
  source: string;
}

export interface ReviewBlock {
  finalized: boolean;
  reviewer?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
}

export interface CanonicalReportResponse {
  schema_version: string;
  run: ReportRun;
  requested_tests: RequestedTestStatus[];
  summary: ReportSummary;
  site_profiles: SiteProfile[];
  dead_hosts: DeadHost[];
  results: Result[];
  artifacts: Artifact[];
  review: ReviewBlock;
}

export interface ErrorResponse {
  error: string;
  message?: string | null;
  unsupported_tests?: string[] | null;
}