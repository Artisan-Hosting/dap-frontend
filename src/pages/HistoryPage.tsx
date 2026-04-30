import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { useRunHistory } from '../hooks/useRunHistory';
import '../styles/tokens.css';
import '../App.css';
import { useEffect } from 'react';
import Footer from '../components/Footer';

export function HistoryPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { history, deleteRun } = useRunHistory();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleDelete = (runId: string) => {
    if (window.confirm('Are you sure you want to delete this audit from history?')) {
      deleteRun(runId);
    }
  };

  return (
    <div className="app">
      <TopBar>
        <ThemeToggle />
      </TopBar>

      <main className="wrap">
        <section className="hero">
          <div className="hero-content">
            <h2>Audit History</h2>
            <p>View and manage all your previous audits.</p>
          </div>
        </section>

        <section className="results-section">
          {history.length === 0 ? (
            <div className="results-card">
              <p style={{ textAlign: 'center', color: 'var(--text-2)' }}>
                No audit history yet. Start by running your first audit!
              </p>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                  Run Audit
                </button>
              </div>
            </div>
          ) : (
            <div className="history-list">
              <div className="history-summary">
                Total runs: {history.length}
              </div>
              {history.map((run) => (
                <div key={run.runId} className="history-item">
                  <div className="history-info">
                    <div className="history-target">{run.target}</div>
                    <div className="history-meta">
                      <span className={`history-status ${run.cacheHit ? 'cached' : 'fresh'}`}>
                        {run.cacheHit ? '📦 Cached' : '✨ Fresh'}
                      </span>
                      <span className="history-time">
                        {new Date(run.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="history-actions">
                    <button
                      className="btn btn-small"
                      onClick={() => navigate(`/report/${run.runId}`)}
                    >
                      View Report
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(run.runId)}
                      title="Delete this audit from history"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default HistoryPage;
