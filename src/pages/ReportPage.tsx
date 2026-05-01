import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ContactRequestModal from '../components/ContactRequestModal';
import ResultsByTarget from '../components/ResultsByTarget';
import TopBar from '../components/TopBar';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { useRunHistory } from '../hooks/useRunHistory';
import { trackEvent } from '../lib/analytics';
import {
  submitContactRequest,
  type ContactRequestFormValues,
} from '../lib/contactRequest';
import { getRunReport } from '../lib/api';
import type { CanonicalReportResponse } from '../types/api';
import '../styles/tokens.css';
import '../App.css';
import Footer from '../components/Footer';
import { setPageSeo } from '../lib/seo';

export function ReportPage() {
  const { theme } = useTheme();
  const { addRun } = useRunHistory();
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<CanonicalReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deadHostsExpanded, setDeadHostsExpanded] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState<{ content: unknown; title: string } | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const reportTarget = report?.run.target_input;

    setPageSeo({
      title: reportTarget
        ? `${reportTarget} Audit Report | Artisan DAP`
        : 'Audit Report | Artisan DAP',
      description: reportTarget
        ? `Review website performance, technical SEO, DNS, SSL, email, and security findings for ${reportTarget}.`
        : 'Review website performance, technical SEO, DNS, SSL, email, and security audit findings.',
      path: runId ? `/report/${runId}` : '/report',
      robots: 'noindex,follow',
      structuredData: null,
    });
  }, [report, runId]);

  useEffect(() => {
    async function fetchReport() {
      if (!runId) {
        setError('No run ID provided');
        setLoading(false);
        return;
      }

      try {
        const rep = await getRunReport(runId);
        setReport(rep);
        trackEvent('Report Loaded', {
          cache_hit: rep.run.cache_hit,
          result_count: rep.results.length,
          site_profile_count: rep.site_profiles.length,
          dead_host_count: rep.dead_hosts.length,
          pass_count: rep.summary.result_counts.pass,
          warn_count: rep.summary.result_counts.warn,
          fail_count: rep.summary.result_counts.fail,
          error_count: rep.summary.result_counts.error,
        });
      } catch (err) {
        trackEvent('Report Load Failed');
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [runId]);

  useEffect(() => {
    if (!report || !runId) return;

    addRun({
      runId,
      target: report.run.target_input,
      timestamp: Date.now(),
      cacheHit: report.run.cache_hit,
      done: true,
    });
  }, [report, runId, addRun]);

  async function handleContactRequestSubmit(formValues: ContactRequestFormValues) {
    if (!report) {
      throw new Error('Report context is not available.');
    }

    // This page-level handler is the frontend capture point for result context.
    // Keep email delivery wiring behind submitContactRequest(), but build the
    // payload here so run-specific data stays obvious and easy to extend.
    const resultRunId = report.run.run_id;

    await submitContactRequest({
      ...formValues,
      runId: resultRunId,
      target: report.run.target_input,
      source: 'report_page',
      cacheHit: report.run.cache_hit,
      resultCounts: report.summary.result_counts,
    });
  }

  if (loading) {
    return (
      <div className="app">
        <TopBar>
          <ThemeToggle />
        </TopBar>
        <main className="wrap">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>Loading report...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="app">
        <TopBar>
          <ThemeToggle />
        </TopBar>
        <main className="wrap">
          <section className="hero">
            <div className="hero-content">
              <h2>Report Not Found</h2>
              <p>{error || 'Unable to load the report for this run.'}</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  trackEvent('Back To Audit Clicked', {
                    source: 'report_error_state',
                  });
                  navigate('/');
                }}
              >
                Back to Audit
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar>
        <ThemeToggle />
      </TopBar>

      <main className="wrap">
        <section className="results-section">
          <div className="results-header">
            <div className="results-title-block">
              <h2>Results for {report.run.target_input}</h2>
              <div className={`cache-status ${report.run.cache_hit ? 'cached' : 'fresh'}`}>
                <span className="cache-badge">{report.run.cache_hit ? '📦 Cached' : '✨ Fresh'}</span>
                <span className="cache-text">
                  {report.run.cache_hit 
                    ? 'Results from previous audit' 
                    : 'Results from new audit'}
                </span>
              </div>
              <div className="run-meta-info">
                <span>Run ID: {report.run.run_id}</span>
                <span>Submitted: {new Date(report.run.submitted_at).toLocaleString()}</span>
                {report.run.completed_at && (
                  <span>Completed: {new Date(report.run.completed_at).toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="result-summary-row">
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

              <button
                className="btn btn-primary result-cta"
                onClick={() => {
                  trackEvent('Contact CTA Clicked', {
                    source: 'report_page',
                    cache_hit: report.run.cache_hit,
                  });
                  setIsContactModalOpen(true);
                }}
                type="button"
              >
                Want a human to look at it?
              </button>
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
              <button
                className="subdomain-header-btn"
                onClick={() => {
                  trackEvent('Dead Hosts Toggled', {
                    expanded: !deadHostsExpanded,
                    dead_host_count: report.dead_hosts.length,
                  });
                  setDeadHostsExpanded(!deadHostsExpanded);
                }}
                style={{ width: '100%', marginBottom: deadHostsExpanded ? '12px' : '0' }}
              >
                <span className="expand-icon">{deadHostsExpanded ? '▼' : '▶'}</span>
                <h4 className="subdomain-header">Dead / Zombie Sites ({report.dead_hosts.length})</h4>
              </button>
              {deadHostsExpanded && (
                <div className="dead-host-list">
                  {report.dead_hosts.map((dead, idx) => (
                    <div key={idx} className="dead-host-item">
                      <span className="dead-host">{dead.host}</span>
                      <span className="dead-reason">{dead.reason}</span>
                      <span className="dead-source">Source: {dead.source}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

           <div className="results-card results-card-wide">
             <h3>Test Results ({report.results.length})</h3>
             <ResultsByTarget
               onViewRawEvidence={(content, title) => {
                 trackEvent('Raw Evidence Opened', {
                   title_length: title.length,
                 });
                 setEvidenceModal({ content, title });
               }}
               results={report.results}
             />
           </div>

           <button
             className="btn btn-secondary"
             onClick={() => {
               trackEvent('Back To Audit Clicked', {
                 source: 'report_page',
               });
               navigate('/');
             }}
           >
             Back to Audit
           </button>
         </section>

        {evidenceModal && (
          <div
            className="modal-overlay"
            onClick={() => {
              trackEvent('Raw Evidence Closed', {
                action: 'overlay',
              });
              setEvidenceModal(null);
            }}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{evidenceModal.title}</h3>
                <button
                  className="modal-close"
                  onClick={() => {
                    trackEvent('Raw Evidence Closed', {
                      action: 'close_button',
                    });
                    setEvidenceModal(null);
                  }}
                >
                  ✕
                </button>
              </div>
              <pre className="modal-evidence">{JSON.stringify(evidenceModal.content, null, 2)}</pre>
            </div>
          </div>
        )}

        <ContactRequestModal
          isOpen={isContactModalOpen}
          runId={report.run.run_id}
          target={report.run.target_input}
          onClose={() => setIsContactModalOpen(false)}
          onSubmit={handleContactRequestSubmit}
        />
      </main>

      <Footer />
    </div>
  );
}

export default ReportPage;
