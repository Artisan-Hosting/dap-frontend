import { useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import { useRunHistory } from './hooks/useRunHistory';

// Toggle for hard cap on audit count (for testing)
(window as any).AUDIT_LIMIT_ENABLED = false;
(window as any).AUDIT_LIMIT_MAX = 50;
import { Footer } from './components/Footer';
import {
  listSupportedTests,
  createRun,
  getRunStatus,
  getRunReport,
  isTerminalState,
  POLL_INTERVAL_MS,
} from './lib/api';
import type { CreateRunResponse, RunStatusResponse, CanonicalReportResponse, RunState, SupportedTest } from './types/api';
import './styles/tokens.css';
import './App.css';

const QUIRKY_TEXTS: Record<RunState, string[]> = {
  queued: [
    "Your audit is doing the worm waiting in line...",
    "Patience, young grasshopper...",
    "We're Probably on it ...",
    "Do you ever think that this could be hung and you'd never know ?",
  ],
  discovering: [
    "Seeking hidden subdomains like a digital Sherlock...",
    "Knock knock? Who's there? We're about to find out...",
    "Subdomains, where art thou?",
    "Flipping over rocks and shit",
    "Asking the dns to politely tell us everything",
    "Polishing our maginfying glass",
    "Pondering",
  ],
  planning: [
    "Figuring out which tests to run like a strategic general...",
    "Strategizing the audit assault...",
    "Building the perfect test cocktail...",
    "Calculating optimal tests to run, Probably ....",
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

function getQuirkyText(state: RunState, index: number): string {
  const texts = QUIRKY_TEXTS[state] || QUIRKY_TEXTS.running;
  return texts[index % texts.length];
}

function groupResultsByTarget(results: import('./types/api').Result[]) {
  const groups: Record<string, import('./types/api').Result[]> = {};
  for (const result of results) {
    const key = result.target;
    if (!groups[key]) groups[key] = [];
    groups[key].push(result);
  }
  return groups;
}

function App() {
  const { theme } = useTheme();
  const { addRun, history } = useRunHistory();
  const [target, setTarget] = useState('');
  const [supportedTests, setSupportedTests] = useState<SupportedTest[]>([]);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatusResponse | null>(null);
  const [report, setReport] = useState<CanonicalReportResponse | null>(null);
  const [quirkyIndex, setQuirkyIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [testsLoading, setTestsLoading] = useState(true);
  const [expandedSubdomains, setExpandedSubdomains] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    setExpandedSubdomains(new Set());
  }, [report]);

  useEffect(() => {
    if (report && runId) {
      addRun({
        runId,
        target,
        timestamp: Date.now(),
        cacheHit: report.run.cache_hit,
        done: true,
      });
    }
  }, [report, runId, target, addRun]);

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

  useEffect(() => {
    if (!runId || isTerminalState(runState || 'queued')) return;

    const pollInterval = setInterval(async () => {
      try {
        const newStatus = await getRunStatus(runId);
        setStatus(newStatus);
        setPollCount((c) => c + 1);
        setRunState(newStatus.state);
        setQuirkyIndex((c) => c + 1);

        if (isTerminalState(newStatus.state)) {
          clearInterval(pollInterval);
          if (newStatus.state === 'completed' || newStatus.state === 'cache_hit') {
            fetchReport(runId);
          }
        }
      } catch (err) {
        setError((err as Error).message);
        setRunState('failed');
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [runId, runState]);

  async function fetchReport(rid: string) {
    try {
      const rep = await getRunReport(rid);
      setReport(rep);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target.trim()) return;

    setError(null);
    setRunState('queued');
    setStatus(null);
    setReport(null);
    setPollCount(0);
    setQuirkyIndex(0);

    try {
      const result: CreateRunResponse = await createRun({
        target: target.trim().toLowerCase(),
        requested_tests: supportedTests.map(t => t.id),
      });
      setRunId(result.run_id);
      setRunState(result.state);

      if (isTerminalState(result.state)) {
        if (result.state === 'completed' || result.state === 'cache_hit') {
          fetchReport(result.run_id);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setRunState('failed');
    }
  }

  const progressPercent = status
    ? Math.round(
        ((status.counts.completed + status.counts.failed_to_start) /
          status.counts.planned) *
          100
      )
    : runState && !isTerminalState(runState)
    ? Math.max(10, (pollCount * 5) % 80)
    : 0;

  return (
    <div className="app">
      <TopBar>
        <ThemeToggle />
      </TopBar>

      <main className="wrap">
        {!runState || isTerminalState(runState) ? (
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
                <p className="tests-info">
                  {supportedTests.length} test{supportedTests.length !== 1 ? 's' : ''} available
                </p>
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
                    disabled={!target.trim() || (runState !== null && !isTerminalState(runState)) || testsLoading}
                  >
                    Run Audit
                  </button>
                </div>
              </form>

              {error && <div className="error-message">{error}</div>}
            </div>

            {history.length > 0 && (
              <div className="recent-runs-card">
                <h3>Recent Audits</h3>
                <div className="recent-runs-list">
                  {history.slice(0, 5).map((run) => (
                    <div key={run.runId} className="recent-run-item">
                      <div className="run-target">{run.target}</div>
                      <div className="run-meta">
                        <span className={`run-status ${run.cacheHit ? 'cached' : 'fresh'}`}>
                          {run.cacheHit ? '📦' : '✨'}
                        </span>
                        <span className="run-time">
                          {new Date(run.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
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
                <div className="progress-text">{progressPercent}%</div>
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
                {getQuirkyText(runState, quirkyIndex)}
              </div>
            </div>
          </section>
        )}

        {report && (
           <section className="results-section">
             <div className="results-header">
               <div className="results-title-block">
                 <h2>Results for {target}</h2>
                 <div className={`cache-status ${report.run.cache_hit ? 'cached' : 'fresh'}`}>
                   <span className="cache-badge">{report.run.cache_hit ? '📦 Cached' : '✨ Fresh'}</span>
                   <span className="cache-text">
                     {report.run.cache_hit 
                       ? 'Results from previous audit' 
                       : 'Results from new audit'}
                   </span>
                 </div>
               </div>
               <div className="result-summary">
                 <div className="summary-item pass">
                   <span className="summary-count">{report.summary.result_counts.pass}</span>
                   <span className="summary-label">Pass</span>
                 </div>
                 <div className="summary-item warn">
                   <span className="summary-count">{report.summary.result_counts.warn}</span>
                   <span className="summary-label">Warn</span>
                 </div>
                 <div className="summary-item fail">
                   <span className="summary-count">{report.summary.result_counts.fail}</span>
                   <span className="summary-label">Fail</span>
                 </div>
                 <div className="summary-item error">
                   <span className="summary-count">{report.summary.result_counts.error}</span>
                   <span className="summary-label">Error</span>
                 </div>
               </div>
             </div>

            {report.site_profiles.length > 0 && (
              <div className="results-card">
                <h3>Subdomains Discovered ({report.site_profiles.length})</h3>
                <div className="subdomain-list">
                  {report.site_profiles.map((profile, idx) => (
                    <div key={idx} className="subdomain-item">
                      <span className="subdomain-host">{profile.host}</span>
                      <span className="subdomain-kind">{profile.kind}</span>
                      {profile.provider && (
                        <span className="subdomain-provider">{profile.provider}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.dead_hosts.length > 0 && (
              <div className="results-card dead-hosts">
                <h3>Dead / Zombie Sites ({report.dead_hosts.length})</h3>
                <div className="dead-host-list">
                  {report.dead_hosts.map((dead, idx) => (
                    <div key={idx} className="dead-host-item">
                      <span className="dead-host">{dead.host}</span>
                      <span className="dead-reason">{dead.reason}</span>
                      <span className="dead-source">Source: {dead.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="results-card">
              <h3>Test Results ({report.results.length})</h3>
              <div className="test-results">
                {Object.entries(groupResultsByTarget(report.results)).map(([subdomain, results]) => {
                  const isExpanded = expandedSubdomains.has(subdomain);
                  return (
                    <div key={subdomain} className="subdomain-group">
                      <button
                        className="subdomain-header-btn"
                        onClick={() => {
                          const newExpanded = new Set(expandedSubdomains);
                          if (isExpanded) {
                            newExpanded.delete(subdomain);
                          } else {
                            newExpanded.add(subdomain);
                          }
                          setExpandedSubdomains(newExpanded);
                        }}
                      >
                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                        <h4 className="subdomain-header">{subdomain}</h4>
                        <span className="test-count">({results.length})</span>
                      </button>
                      
                      {isExpanded && (
                        <div className="subdomain-results">
                          {results.map((result, idx) => (
                            <div key={`${subdomain}-${idx}`} className={`result-item ${result.status}`}>
                              <div className="result-header">
                                <span className="result-test">{result.test_id}</span>
                                <span className={`result-status ${result.status}`}>
                                  {result.status}
                                </span>
                              </div>
                              <div className="result-severity">{result.severity}</div>
                              {result.notes && <div className="result-notes">{result.notes}</div>}
                              
                              {result.evidence && (
                                <div className="result-evidence">
                                  <div className="evidence-label">Evidence:</div>
                                  <pre className="evidence-content">{JSON.stringify(result.evidence, null, 2)}</pre>
                                </div>
                              )}
                              
                              {result.recommendations.length > 0 && (
                                <div className="result-recommendations">
                                  <div className="recommendations-label">Recommendations:</div>
                                  {result.recommendations.map((rec, i) => (
                                    <div key={i} className="recommendation">{rec}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => {
                setRunState(null);
                setRunId(null);
                setStatus(null);
                setReport(null);
                setTarget('');
              }}
            >
              New Audit
            </button>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
