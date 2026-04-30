import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TestSettingsModal from '../components/TestSettingsModal';
import TopBar from '../components/TopBar';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { useRunHistory } from '../hooks/useRunHistory';
import { isBlockedContactTarget } from '../lib/contactRequest';
import { getAuditLimitEnabled, getAuditLimitMax } from '../lib/auditLimit';

// Hard audit limit toggle, with optional window overrides for local testing.
const AUDIT_LIMIT_ENABLED: boolean = getAuditLimitEnabled();
const AUDIT_LIMIT_MAX: number = getAuditLimitMax();
import {
  listSupportedTests,
  createRun,
  getRunStatus,
  isTerminalState,
  POLL_INTERVAL_MS,
} from '../lib/api';
import type { CreateRunResponse, RunStatusResponse, RunState, SupportedTest } from '../types/api';
import '../styles/tokens.css';
import '../App.css';
import Footer from '../components/Footer';

const CONNECTION_ERROR_TEXTS: string[] = [
  "Looks like the internet took a coffee break...",
  "Connection lost. Did you forget to pay the WiFi bill?",
  "The tubes are clogged. Stand by...",
  "Internet machine broke. Attempting percussive maintenance...",
  "404: Connection not found. But we're still looking!",
  "The hamsters powering our servers need a break...",
  "Signal lost. Sending carrier pigeons instead...",
  "Your packets took a wrong turn at the router...",
  "Connection timeout. Time doesn't wait, but we do!",
  "The cloud is foggy today. Visibility limited...",
];

const QUIRKY_TEXTS: Record<RunState, string[]> = {
  queued: [
    "Your audit is doing the worm waiting in line...",
    "Patience, young grasshopper...",
    "We're on it! Probably...",
  ],
  discovering: [
    "Seeking hidden subdomains like a digital Sherlock...",
    "Knock knock? Who's there? We're about to find out...",
    "Subdomains, where art thou?",
  ],
  planning: [
    "Figuring out which tests to run like a strategic general...",
    "Strategizing the audit assault...",
    "Building the perfect test cocktail...",
  ],
  running: [
    "Running tests faster than a caffeinated developer...",
    "Testing, so you don't have to...",
    "Technically running. Probably...",
  ],
  aggregating: [
    "Collecting all the data like a digital hoarder...",
    "Wrangling results into submission...",
    "Making sense of the chaos...",
  ],
  completed: [
    "Behold! The results are upon thee!",
    "All done! No more waiting!",
    "Done! Now wasn't that fun?",
  ],
  failed: [
    "Well, that didn't go as planned...",
    "Sometimes tests fail. It's a feature, not a bug... right?",
    "Oops! Our bad. Let's try again?",
  ],
  cache_hit: [
    "Results from the vault! Fresh(ish) from the cache...",
    "We've seen this one before! Here's the memo...",
    "Cache hit! No computations were harmed.",
  ],
  canceled: [
    "Sometimes you just gotta give up...",
    "Canceled! But was it ever really started?",
    "We gave up. So gracefully.",
  ],
};

function getQuirkyText(state: RunState | null, index: number): string {
  const safeState = state ?? 'running';
  const texts = QUIRKY_TEXTS[safeState] || QUIRKY_TEXTS.running;
  return texts[index % texts.length];
}

function isInternalDiscoveryAddon(test: SupportedTest): boolean {
  return test.category === 'internal' || test.runtime === 'internal';
}

function getDefaultSelectedTestIds(tests: SupportedTest[]): string[] {
  return tests
    .filter((test) => !isInternalDiscoveryAddon(test))
    .map((test) => test.id);
}

const SELECTED_TESTS_STORAGE_KEY = 'artisan-dap-selected-tests';

function loadSelectedTestIds(): string[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(SELECTED_TESTS_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue) || !parsedValue.every((value) => typeof value === 'string')) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

function persistSelectedTestIds(selectedTestIds: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SELECTED_TESTS_STORAGE_KEY, JSON.stringify(selectedTestIds));
}

function AuditPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { addRun, history } = useRunHistory();
  const [target, setTarget] = useState('');
  const [supportedTests, setSupportedTests] = useState<SupportedTest[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>(() => loadSelectedTestIds() ?? []);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatusResponse | null>(null);
  const [quirkyIndex, setQuirkyIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [testsLoading, setTestsLoading] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAuditLimitModalOpen, setIsAuditLimitModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Recover runId from storage on mount in case of connection drop
  useEffect(() => {
    if (runId || history.length === 0) return;

    // Find the most recent run that might still be in progress
    const mostRecent = history[0];
    if (mostRecent && !mostRecent.done) {
      // Attempt to recover by setting the runId so polling can resume
      setRunId(mostRecent.runId);
      setRunState('queued');
      setPollCount(0);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const supportedIds = supportedTests.map((test) => test.id);
    const defaultSelectedIds = getDefaultSelectedTestIds(supportedTests);
    const storedSelectedTestIds = loadSelectedTestIds();

    if (supportedIds.length === 0) {
      return;
    }

    if (!storedSelectedTestIds) {
      setSelectedTestIds(defaultSelectedIds);
      persistSelectedTestIds(defaultSelectedIds);
      return;
    }

    const availableStoredSelection = storedSelectedTestIds.filter((testId) =>
      supportedIds.includes(testId)
    );

    if (availableStoredSelection.length !== storedSelectedTestIds.length) {
      const nextSelection = availableStoredSelection.length > 0
        ? availableStoredSelection
        : defaultSelectedIds;
      setSelectedTestIds(nextSelection);
      persistSelectedTestIds(nextSelection);
      return;
    }

    setSelectedTestIds(storedSelectedTestIds);
  }, [supportedTests]);

  useEffect(() => {
    // If we have a runId (from new run or loaded from storage), show loading screen
    // This allows resuming loading state for runs that are in progress
    if (runId && (!runState || !isTerminalState(runState))) {
      // If we don't have a state yet, set it to polling
      if (!runState) {
        setRunState('queued');
        setPollCount(0);
      }
    }
  }, [runId]);

  useEffect(() => {
    async function fetchTests() {
      try {
        const response = await listSupportedTests();
        setSupportedTests(response.tests);
      } catch (err) {
        console.error('Failed to fetch supported tests:', err);
      } finally {
        setTestsLoading(false);
      }
    }
    fetchTests();

    const testsInterval = setInterval(fetchTests, 60000);
    return () => clearInterval(testsInterval);
  }, []);

  const [isConnectionError, setIsConnectionError] = useState(false);
  const [retryRemainingMs, setRetryRemainingMs] = useState(0);
  const [connectionErrorIndex, setConnectionErrorIndex] = useState(0);
  const retryCountRef = useRef(0);
  const retryCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!runId || (runState !== null && isTerminalState(runState))) {
      // Clear any active countdown when not polling
      if (retryCountdownRef.current) {
        clearInterval(retryCountdownRef.current);
        retryCountdownRef.current = null;
      }
      setIsConnectionError(false);
      setRetryRemainingMs(0);
      setConnectionErrorIndex(0);
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const newStatus = await getRunStatus(runId);
        setStatus(newStatus);
        setPollCount((c) => c + 1);
        setRunState(newStatus.state);
        setQuirkyIndex((c) => c + 1);
        setIsConnectionError(false);
        setRetryRemainingMs(0);
        retryCountRef.current = 0;

        if (isTerminalState(newStatus.state)) {
          clearInterval(pollInterval);
          if (newStatus.state === 'completed' || newStatus.state === 'cache_hit') {
            navigate(`/report/${runId}`);
          } else {
            setTimeout(() => setRunId(null), 0);
          }
        }
      } catch (err) {
        const apiError = err as { statusCode?: number; message?: string };
        const isNetworkError = !apiError.statusCode || apiError.statusCode === 0;

        if (isNetworkError) {
          retryCountRef.current += 1;
          const backoffMs = Math.min(2000 * Math.pow(1.5, retryCountRef.current - 1), 30000);
          setIsConnectionError(true);
          setRetryRemainingMs(backoffMs);
          setConnectionErrorIndex((prev) => (prev + 1) % CONNECTION_ERROR_TEXTS.length);

          // Start countdown timer updating every second
          if (retryCountdownRef.current) clearInterval(retryCountdownRef.current);
          retryCountdownRef.current = setInterval(() => {
            setRetryRemainingMs((prev) => {
              const next = prev - 1000;
              if (next <= 0) {
                if (retryCountdownRef.current) {
                  clearInterval(retryCountdownRef.current);
                  retryCountdownRef.current = null;
                }
                return 0;
              }
              return next;
            });
          }, 1000);

          clearInterval(pollInterval);
          setTimeout(() => {
            if (runId && !isTerminalState(runState ?? 'queued')) {
              setRunState(runState ?? 'queued');
            }
          }, backoffMs);
        } else {
          setError(apiError.message || 'Server error occurred');
          setRunState('failed');
          clearInterval(pollInterval);
          // Reset runId so form shows again after failure
          setTimeout(() => setRunId(null), 0);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollInterval);
      if (retryCountdownRef.current) {
        clearInterval(retryCountdownRef.current);
        retryCountdownRef.current = null;
      }
    };
  }, [navigate, runId, runState]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target.trim()) return;

    const trimmedTarget = target.trim().toLowerCase();
    if (isBlockedContactTarget(trimmedTarget)) {
      setError("That looks like a lot of work, I'll pass.");
      setRunState(null);
      return;
    }

    setError(null);
    setRunState('queued');
    setStatus(null);
    setPollCount(0);
    setQuirkyIndex(0);

    try {
      // Check if user has reached the hard audit limit
      if (typeof AUDIT_LIMIT_ENABLED !== 'undefined' && AUDIT_LIMIT_ENABLED && history.length >= AUDIT_LIMIT_MAX) {
        setIsAuditLimitModalOpen(true);
        setRunState(null);
        return;
      }

      const result: CreateRunResponse = await createRun({
        target: target.trim().toLowerCase(),
        requested_tests: selectedTestIds,
      });

      // Persist runId immediately so we can recover if connection drops
      addRun({
        runId: result.run_id,
        target: target.trim().toLowerCase(),
        timestamp: Date.now(),
        cacheHit: false,
        done: false,
      });

      setRunId(result.run_id);
      setRunState(result.state);

      if (isTerminalState(result.state)) {
        if (result.state === 'completed' || result.state === 'cache_hit') {
          navigate(`/report/${result.run_id}`);
        } else {
          setRunId(null);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setRunState('failed');
    }
  }

  function handleSaveSelectedTests(nextSelection: string[]) {
    setSelectedTestIds(nextSelection);
    persistSelectedTestIds(nextSelection);
  }

  const isPendingProgress = !status || status.counts.planned === 0;
  const progressPercent = isPendingProgress
    ? 12
    : Math.round(
        ((status.counts.completed + status.counts.failed_to_start) /
          status.counts.planned) *
          100
      );

  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    if (!runState || isTerminalState(runState) || (status && status.counts.planned > 0)) return;
    const dotInterval = setInterval(() => {
      setDotCount((c) => (c % 3) + 1);
    }, 500);
    return () => clearInterval(dotInterval);
  }, [runState, status]);

  return (
    <div className="app">
      <TopBar onOpenSettings={() => setIsSettingsModalOpen(true)}>
        <ThemeToggle />
      </TopBar>

        <main className="wrap">
          {(!runState || isTerminalState(runState)) && !runId ? (
          <section className="hero">
            <div className="hero-content">
              <h2>Audit your domain</h2>
              <p>
                Enter a domain to discover subdomains, test DNS configuration,
                hsts data and more.
              </p>

              {testsLoading ? (
                <p className="tests-info">Loading available tests...</p>
              ) : (
                <>
                  <p className="tests-info">
                    {selectedTestIds.length} of {supportedTests.length} test{supportedTests.length !== 1 ? 's' : ''} selected
                  </p>
                  {AUDIT_LIMIT_ENABLED && (
                    <p className="tests-info">
                      Anonymous usage is capped at {AUDIT_LIMIT_MAX} audit{AUDIT_LIMIT_MAX === 1 ? '' : 's'}.
                    </p>
                  )}
                </>
              )}

              <form onSubmit={handleSubmit} className="domain-form">
                <div className="input-group">
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="totalycooldomain.com"
                    className="domain-input"
                    disabled={runState !== null && !isTerminalState(runState) || testsLoading}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!target.trim() || selectedTestIds.length === 0 || (runState !== null && !isTerminalState(runState)) || testsLoading}
                  >
                    Run Audit
                  </button>
                </div>
              </form>

              {!testsLoading && selectedTestIds.length === 0 && (
                <div className="error-message">Select at least one test in Settings before running an audit.</div>
              )}

              {error && <div className="error-message">{error}</div>}
            </div>

            {history.length > 0 && (
              <div className="recent-runs-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Recent Audits</h3>
                  {history.length > 5 && (
                    <button 
                      className="btn btn-small" 
                      onClick={() => navigate('/history')}
                    >
                      View All ({history.length})
                    </button>
                  )}
                </div>
                <div className="recent-runs-list">
                  {history.slice(0, 5).map((run) => (
                    <button 
                      key={run.runId} 
                      className="recent-run-item" 
                      onClick={() => navigate(`/report/${run.runId}`)}
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                    >
                      <div className="run-target">{run.target}</div>
                      <div className="run-meta">
                        <span className={`run-status ${run.cacheHit ? 'cached' : 'fresh'}`}>
                          {run.cacheHit ? '📦' : '✨'}
                        </span>
                        <span className="run-time">
                          {new Date(run.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="loading-section">
            <div className="loading-card">
              <div className="loading-header">
                <h2>Running Audit</h2>
                <div className="domain-badge">{target}</div>
              </div>

              <div className="loading-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="progress-text">
                  {status && status.counts.planned > 0 ? (
                    `${progressPercent}%`
                  ) : (
                    <span className="progress-text-pending">Pending{' '.repeat(3 - dotCount)}{'.'.repeat(dotCount)}</span>
                  )}
                </div>
              </div>

              <div className="status-info">
                <div className="status-item">
                  <span className="status-label">Status:</span>
                  <span className="status-value">{runState}</span>
                </div>
                {status && (
                  <>
                    <div className="status-item">
                      <span className="status-label">Tests:</span>
                      <span className="status-value">
                        {status.counts.completed} / {status.counts.planned}
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Elapsed:</span>
                      <span className="status-value">
                        {Math.floor(pollCount * POLL_INTERVAL_MS / 1000)}s
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="quirky-text">
                <span className="quirky-dot">●</span>
                <span className="quirky-message">{getQuirkyText(runState, quirkyIndex)}</span>
              </div>

              {isConnectionError && (
                <div className="connection-error-banner">
                  <span className="connection-error-icon">⚠️</span>
                  <div className="connection-error-content">
                    <div className="connection-error-text">
                      {CONNECTION_ERROR_TEXTS[connectionErrorIndex]}
                    </div>
                    <div className="connection-error-status">
                      Retrying in {Math.max(0, Math.ceil(retryRemainingMs / 1000))}s... (attempt {retryCountRef.current})
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

          {isAuditLimitModalOpen && (
            <div className="modal-overlay" onClick={() => setIsAuditLimitModalOpen(false)}>
              <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>You've hit the {AUDIT_LIMIT_MAX}-audit cap.</h3>
                  <button className="modal-close" onClick={() => setIsAuditLimitModalOpen(false)} type="button">
                    ✕
                  </button>
                </div>
                <div className="contact-form">
                  <p className="contact-copy">
                    You've already used all {AUDIT_LIMIT_MAX} anonymous audit{AUDIT_LIMIT_MAX === 1 ? '' : 's'}. Make an account to keep running audits, or send one to our team so we can help you make a plan.
                  </p>
                  <div className="contact-actions">
                    <button className="btn btn-secondary" onClick={() => setIsAuditLimitModalOpen(false)} type="button">
                      Maybe Later
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        setIsAuditLimitModalOpen(false);
                      }}
                      type="button"
                    >
                      Okay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <TestSettingsModal
            isOpen={isSettingsModalOpen}
            tests={supportedTests}
            selectedTestIds={selectedTestIds}
            onClose={() => setIsSettingsModalOpen(false)}
            onSave={handleSaveSelectedTests}
          />
        </main>

        <Footer />
      </div>
    );
  }

export default AuditPage;
