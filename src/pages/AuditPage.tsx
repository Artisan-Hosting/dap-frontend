import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TestSettingsModal from '../components/TestSettingsModal';
import TopBar from '../components/TopBar';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { useRunHistory } from '../hooks/useRunHistory';
import { isBlockedContactTarget } from '../lib/contactRequest';
import { getAuditLimitEnabled, getAuditLimitMax } from '../lib/auditLimit';
import { summarizeTarget, trackEvent } from '../lib/analytics';

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
import { setPageSeo, SITE_URL } from '../lib/seo';

const HOME_PAGE_TITLE = 'Website Performance Audit & Technical SEO Tool | Artisan DAP';
const HOME_PAGE_DESCRIPTION =
  'Run a website performance audit and technical SEO check for domains and subdomains. Review Core Web Vitals, security headers, DNS, SSL, email, and discovery findings in one report.';

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
    "The queue is vibrating with administrative suspense...",
    "Your request has been placed gently into the audit hopper...",
    "The paperwork goblin has stamped this one urgent-ish...",
    "A clipboard just changed hands. Progress feels imminent...",
    "The machinery is humming in a tone we choose to interpret as confidence...",
    "Your spot in line has been upgraded from mysterious to active...",
  ],
  discovering: [
    "Seeking hidden subdomains like a digital Sherlock...",
    "Knock knock? Who's there? We're about to find out...",
    "Subdomains, where art thou?",
    "Sweeping the hedgerows for servers pretending to be innocent...",
    "Poking at the edges of your domain with a very legal stick...",
    "Discovery mode engaged. The map is unfolding itself dramatically...",
    "There is a surprising amount going on here...",
  ],
  planning: [
    "Figuring out which tests to run like a strategic general...",
    "Strategizing the audit assault...",
    "Building the perfect test cocktail...",
    "Arranging the test order like a suspiciously intense dinner party...",
    "Consulting the clipboard of destiny...",
    "Deciding which buttons to press in what can only be called a scheme...",
    "Scheming intensely, but in a professional capacity...",
  ],
  running: [
    "Running tests faster than a caffeinated developer...",
    "Testing, so you don't have to...",
    "Technically running. Probably...",
    "The scanners are out there rattling the gates...",
    "We are asking your infrastructure some deeply personal questions...",
    "Several tiny digital inspectors are now wearing hard hats...",
  ],
  aggregating: [
    "Collecting all the data like a digital hoarder...",
    "Wrangling results into submission...",
    "Making sense of the chaos...",
    "Stacking findings into a pile tall enough to concern management...",
    "Sweeping up loose evidence before it escapes into the vents...",
    "Converting raw panic into something spreadsheet-compatible...",
  ],
  completed: [
    "Behold! The results are upon thee!",
    "All done! No more waiting!",
    "Done! Now wasn't that fun?",
    "The audit has landed. Nobody make any sudden movements...",
    "Results assembled, polished, and lightly menacing...",
    "Mission complete. The paperwork now belongs to you...",
  ],
  failed: [
    "Well, that didn't go as planned...",
    "Sometimes tests fail. It's a feature, not a bug... right?",
    "Oops! Our bad. Let's try again?",
    "Something escaped containment during the audit...",
    "The machinery made a noise we did not care for...",
    "Failure occurred. We are blaming the gremlins pending investigation...",
  ],
  cache_hit: [
    "Results from the vault! Fresh(ish) from the cache...",
    "We've seen this one before! Here's the memo...",
    "Cache hit! No computations were harmed.",
    "Pulled straight from the filing cabinet of recent memories...",
    "No need to wake the machines, we already had this one on ice...",
    "Reheated results, still served at a professional temperature...",
  ],
  canceled: [
    "Sometimes you just gotta give up...",
    "Canceled! But was it ever really started?",
    "We gave up. So gracefully.",
    "The audit has been called off and the band is packing up...",
    "All forward momentum has been politely revoked...",
    "Operation canceled. Everyone act natural...",
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

  useEffect(() => {
    setPageSeo({
      title: HOME_PAGE_TITLE,
      description: HOME_PAGE_DESCRIPTION,
      path: '/',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Artisan DAP',
        url: SITE_URL,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        description:
          'Website performance and technical SEO audit tool for domains and subdomains.',
        featureList: [
          'Website performance auditing',
          'Core Web Vitals-style performance checks',
          'Technical SEO auditing',
          'DNS and SSL checks',
          'Security header checks',
          'Subdomain discovery',
          'Email authentication checks',
        ],
      },
    });
  }, []);

  // Recover runId from storage on mount in case of connection drop
  useEffect(() => {
    if (runId || history.length === 0) return;

    // Find the most recent run that might still be in progress
    const mostRecent = history[0];
    if (mostRecent && !mostRecent.done) {
      trackEvent('Audit Recovered From History');
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
        if (!hasTrackedTestsLoadedRef.current) {
          hasTrackedTestsLoadedRef.current = true;
          trackEvent('Supported Tests Loaded', {
            test_count: response.tests.length,
            internal_test_count: response.tests.filter(isInternalDiscoveryAddon).length,
          });
        }
      } catch (err) {
        console.error('Failed to fetch supported tests:', err);
        trackEvent('Supported Tests Load Failed');
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
  const hasTrackedTestsLoadedRef = useRef(false);
  const lastTrackedTerminalStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!runId || !runState || !isTerminalState(runState)) {
      return;
    }

    const trackingKey = `${runId}:${runState}`;
    if (lastTrackedTerminalStateRef.current === trackingKey) {
      return;
    }

    lastTrackedTerminalStateRef.current = trackingKey;
    trackEvent('Audit Terminal State Reached', {
      state: runState,
      selected_test_count: selectedTestIds.length,
    });
  }, [runId, runState, selectedTestIds.length]);

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
          trackEvent('Audit Poll Retry Scheduled', {
            retry_attempt: retryCountRef.current,
            retry_delay_ms: backoffMs,
          });
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
          trackEvent('Audit Poll Failed', {
            status_code: apiError.statusCode ?? 0,
          });
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
      trackEvent('Audit Submission Blocked', {
        reason: 'blocked_target',
        ...summarizeTarget(trimmedTarget),
      });
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
        trackEvent('Audit Submission Blocked', {
          reason: 'audit_limit',
          audit_limit: AUDIT_LIMIT_MAX,
          history_count: history.length,
        });
        setIsAuditLimitModalOpen(true);
        setRunState(null);
        return;
      }

      trackEvent('Audit Submitted', {
        selected_test_count: selectedTestIds.length,
        includes_internal_tests: selectedTestIds.some((testId) =>
          supportedTests.some((test) => test.id === testId && isInternalDiscoveryAddon(test))
        ),
        ...summarizeTarget(trimmedTarget),
      });
      const result: CreateRunResponse = await createRun({
        target: trimmedTarget,
        requested_tests: selectedTestIds,
      });

      // Persist runId immediately so we can recover if connection drops
      addRun({
        runId: result.run_id,
        target: trimmedTarget,
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
      trackEvent('Audit Submission Failed');
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
          <>
            <section className="hero audit-hero">
              <div className="hero-content">
                <div className="audit-hero-heading">
                  <h1>Run a website performance audit and technical SEO check</h1>
                </div>

                <div className="audit-hero-copy">
                  <p>
                    Audit a domain for page speed, Core Web Vitals-style
                    performance signals, technical SEO, DNS, SSL, email, and
                    subdomain exposure. It helps surface issues that can slow down
                    pages, weaken trust, or reduce search visibility.
                  </p>
                  <p>
                    Think of it as a broader outside-in review: PSI-style
                    performance insight plus infrastructure, discovery, and
                    implementation checks in one report.
                  </p>
                  <p>
                    The results are designed to be actionable. Passes show what
                    looks healthy, warnings point to items worth reviewing,
                    failures highlight likely problems, and errors mean a test did
                    not complete cleanly.
                  </p>
                  {/* <p className="hero-note">
                    Heads up: this audit tends to be most reliable on smaller,
                    simpler domains. In larger environments with many subdomains,
                    discovery can be partial, so treat the results as useful
                    guidance rather than a complete inventory.
                  </p> */}
                </div>

                <div className="audit-hero-form-block">
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
              </div>

              {history.length > 0 && (
                <div className="recent-runs-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>Recent Audits</h3>
                    {history.length > 5 && (
                      <button 
                        className="btn btn-small" 
                        onClick={() => {
                          trackEvent('History Navigation Clicked', {
                            source: 'audit_page_recent_runs',
                          });
                          navigate('/history');
                        }}
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
                        onClick={() => {
                          trackEvent('Recent Audit Opened', {
                            source: 'audit_page_recent_runs',
                            cache_hit: run.cacheHit,
                          });
                          navigate(`/report/${run.runId}`);
                        }}
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

            <section className="project-link-section" aria-labelledby="project-link-heading">
              <div className="project-link-card">
                <div className="project-link-copy">
                  <h2 id="project-link-heading">Learn more about this project</h2>
                  <p>
                    Read about what this audit covers, current usage limits,
                    discovery behavior on larger domains, and the roadmap for
                    accounts and advanced tooling.
                  </p>
                </div>
                <div className="project-link-actions">
                  <Link className="btn btn-secondary" to="/about">
                    Learn more about this project
                  </Link>
                </div>
              </div>
            </section>
          </>
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
            <div
              className="modal-overlay"
              onClick={() => {
                trackEvent('Audit Limit Modal Closed', {
                  action: 'overlay',
                });
                setIsAuditLimitModalOpen(false);
              }}
            >
              <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>You've hit the {AUDIT_LIMIT_MAX}-audit cap.</h3>
                  <button
                    className="modal-close"
                    onClick={() => {
                      trackEvent('Audit Limit Modal Closed', {
                        action: 'close_button',
                      });
                      setIsAuditLimitModalOpen(false);
                    }}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
                <div className="contact-form">
                  <p className="contact-copy">
                    You&apos;ve already used all {AUDIT_LIMIT_MAX} anonymous audit{AUDIT_LIMIT_MAX === 1 ? '' : 's'}. Accounts are still on the way, so for now you can send one to our team and we can help you make a plan.
                  </p>
                  <div className="contact-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        trackEvent('Audit Limit Modal Closed', {
                          action: 'maybe_later',
                        });
                        setIsAuditLimitModalOpen(false);
                      }}
                      type="button"
                    >
                      Maybe Later
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        trackEvent('Audit Limit Modal Closed', {
                          action: 'acknowledged',
                        });
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
