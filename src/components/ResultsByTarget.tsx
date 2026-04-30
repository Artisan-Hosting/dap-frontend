import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ResultEvidence from './ResultEvidence';
import type { Result, TestStatus } from '../types/api';

const TEST_DISPLAY_NAMES: Record<string, string> = {
  web_basic_surface: 'Web Surface',
  ip_geolocation: 'IP Geolocation',
  ip_hosting_provider: 'Hosting Provider',
  web_security_headers: 'Security Headers',
  ip_reputation_dnsbl: 'IP Reputation',
  web_hsts: 'HSTS',
  web_mixed_content: 'Mixed Content',
  web_seo_basics: 'SEO Basics',
  dns_cname_chain: 'CNAME Chain',
  psi_web_performance: 'Performance',
  email_probe: 'Email Security',
  ssl_certificate: 'SSL Certificate',
  dnssec_status: 'DNSSEC',
  dmarc: 'DMARC',
  spf: 'SPF',
  dkim: 'DKIM',
};

function getTestDisplayName(testId: string): string {
  return TEST_DISPLAY_NAMES[testId] || testId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface ResultsByTargetProps {
  results: Result[];
  onViewRawEvidence: (content: unknown, title: string) => void;
}

interface ResultGroup {
  testId: string;
  results: Result[];
  aggregateStatus: TestStatus;
}

interface GroupedResultsModalState {
  subdomain: string;
  group: ResultGroup;
}

type ResultCardItem =
  | {
      kind: 'single';
      key: string;
      result: Result;
      estimatedSize: number;
      originalIndex: number;
    }
  | {
      kind: 'group';
      key: string;
      group: ResultGroup;
      estimatedSize: number;
      originalIndex: number;
    };

const STATUS_SCORES: Record<TestStatus, number> = {
  pass: 0,
  info: 0.5,
  skipped: 0.75,
  warn: 2,
  fail: 3,
  error: 4,
};

function groupResultsByTarget(results: Result[]) {
  const groups: Record<string, Result[]> = {};
  for (const result of results) {
    const key = result.target;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(result);
  }
  return groups;
}

function getStatusSummary(results: Result[]) {
  const counts: Partial<Record<TestStatus, number>> = {};
  for (const result of results) {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
  }
  return counts;
}

function getAggregateStatus(results: Result[]): TestStatus {
  if (results.length === 0) {
    return 'info';
  }

  const counts = getStatusSummary(results);
  if ((counts.error ?? 0) === results.length) {
    return 'error';
  }
  if ((counts.fail ?? 0) === results.length) {
    return 'fail';
  }
  if ((counts.warn ?? 0) === results.length) {
    return 'warn';
  }
  if ((counts.pass ?? 0) === results.length) {
    return 'pass';
  }
  if ((counts.skipped ?? 0) === results.length) {
    return 'skipped';
  }

  const averageScore =
    results.reduce((total, result) => total + STATUS_SCORES[result.status], 0) / results.length;

  if (averageScore >= 3.25) {
    return 'error';
  }
  if (averageScore >= 2.25) {
    return 'fail';
  }
  if (averageScore >= 0.75) {
    return 'warn';
  }
  if ((counts.info ?? 0) > 0) {
    return 'info';
  }
  if ((counts.skipped ?? 0) > 0 && (counts.pass ?? 0) === 0) {
    return 'skipped';
  }

  return 'pass';
}

function groupResultsByTestId(results: Result[]): ResultGroup[] {
  const grouped = new Map<string, Result[]>();

  for (const result of results) {
    const existing = grouped.get(result.test_id);
    if (existing) {
      existing.push(result);
      continue;
    }

    grouped.set(result.test_id, [result]);
  }

  return Array.from(grouped.entries()).map(([testId, groupedResults]) => ({
    testId,
    results: groupedResults,
    aggregateStatus:
      groupedResults.length === 1 ? groupedResults[0].status : getAggregateStatus(groupedResults),
  }));
}

function getResultColumnCount(width: number) {
  const minReadableCardWidth = 320;
  return Math.max(1, Math.min(3, Math.floor(width / minReadableCardWidth)));
}

function estimateCollectionSize(value: unknown, depth = 0): number {
  if (depth > 2 || value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'string') {
    return Math.ceil(value.length / 40);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return 1;
  }

  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + 1 + estimateCollectionSize(item, depth + 1), 0);
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (total, item) => total + estimateCollectionSize(item, depth + 1),
      0
    );
  }

  return 0;
}

function estimateResultContentSize(result: Result): number {
  const notesSize = result.notes ? Math.ceil(result.notes.length / 80) : 0;
  const recommendationsSize = result.recommendations.reduce(
    (total, recommendation) => total + Math.max(1, Math.ceil(recommendation.length / 70)),
    0
  );

  switch (result.test_id) {
    case 'ip_geolocation':
    case 'ip_hosting_provider':
      return 6 + notesSize + recommendationsSize;
    case 'web_security_headers':
      return 16 + notesSize + recommendationsSize;
    case 'web_hsts':
      return 9 + notesSize + recommendationsSize;
    case 'web_mixed_content':
      return 8 + estimateCollectionSize(result.evidence) + notesSize + recommendationsSize;
    case 'web_basic_surface':
      return 10 + estimateCollectionSize(result.evidence) + notesSize + recommendationsSize;
    case 'web_seo_basics':
      return 11 + estimateCollectionSize(result.evidence) + notesSize + recommendationsSize;
    case 'dns_cname_chain':
      return 7 + estimateCollectionSize(result.evidence) + notesSize + recommendationsSize;
    case 'ip_reputation_dnsbl':
      return 8 + estimateCollectionSize(result.evidence) + notesSize + recommendationsSize;
    case 'email_probe':
      return 12 + estimateCollectionSize(result.evidence) + notesSize + recommendationsSize;
    case 'psi_web_performance':
      return 18 + estimateCollectionSize(result.evidence) + notesSize + recommendationsSize;
    default:
      return 7 + estimateCollectionSize(result.evidence) + notesSize + recommendationsSize;
  }
}

function buildResultCardItems(groups: ResultGroup[]): ResultCardItem[] {
  return groups.map((group, index) => {
    if (group.results.length === 1) {
      return {
        kind: 'single',
        key: group.results[0].result_id,
        result: group.results[0],
        estimatedSize: estimateResultContentSize(group.results[0]),
        originalIndex: index,
      };
    }

    return {
      kind: 'group',
      key: `${group.testId}-${index}`,
      group,
      estimatedSize: 5 + Math.ceil(group.results.length / 2),
      originalIndex: index,
    };
  });
}

function getResolvedItemSize(item: ResultCardItem, measuredHeights: Record<string, number>) {
  return measuredHeights[item.key] ?? item.estimatedSize;
}

function distributeResultItems(
  items: ResultCardItem[],
  columnCount: number,
  measuredHeights: Record<string, number>
) {
  if (columnCount <= 1) {
    return [items];
  }

  const columns = Array.from({ length: columnCount }, () => [] as ResultCardItem[]);
  const columnHeights = Array.from({ length: columnCount }, () => 0);

  const sortedItems = [...items].sort((left, right) => {
    const rightSize = getResolvedItemSize(right, measuredHeights);
    const leftSize = getResolvedItemSize(left, measuredHeights);

    if (rightSize !== leftSize) {
      return rightSize - leftSize;
    }

    return left.originalIndex - right.originalIndex;
  });

  for (const item of sortedItems) {
    let targetColumn = 0;
    for (let index = 1; index < columnHeights.length; index += 1) {
      if (columnHeights[index] < columnHeights[targetColumn]) {
        targetColumn = index;
      }
    }

    columns[targetColumn].push(item);
    columnHeights[targetColumn] += getResolvedItemSize(item, measuredHeights);
  }

  return columns;
}

function formatStatusBreakdown(results: Result[]) {
  return Object.entries(getStatusSummary(results))
    .map(([status, count]) => `${count} ${status}`)
    .join(' · ');
}

function getGroupedResultExplanation(testId: string, count: number) {
  if (count === 1) {
    if (
      testId === 'ip_hosting_provider' ||
      testId === 'ip_geolocation' ||
      testId === 'ip_reputation_dnsbl'
    ) {
      return 'This is one IP-specific observation for the selected host. If the host resolves to multiple edge IPs or address families, the same test can appear more than once.';
    }

    if (testId.startsWith('dns_')) {
      return 'This is one DNS-path observation for the selected host. Some domains produce multiple results when more than one answer, chain, or resolution path is observed.';
    }

    return 'This card represents one observed result for the selected test. Open the detail below to inspect the full evidence, notes, and recommendations.';
  }

  if (
    testId === 'ip_hosting_provider' ||
    testId === 'ip_geolocation' ||
    testId === 'ip_reputation_dnsbl'
  ) {
    return `This test produced ${count} individual results because the host resolved to multiple IPs or edge nodes. Each card below reflects one IP-specific observation.`;
  }

  if (testId.startsWith('dns_')) {
    return `This test produced ${count} individual results because more than one DNS answer or resolution path was observed. Each card below reflects one observed chain or endpoint.`;
  }

  return `This test produced ${count} individual results because the same check was observed across more than one endpoint, address family, or response path. Each card below preserves the individual evidence.`;
}

function SingleResultCard({
  cardRef,
  result,
  subdomain,
  onViewRawEvidence,
}: {
  cardRef?: (node: HTMLDivElement | null) => void;
  result: Result;
  subdomain: string;
  onViewRawEvidence: (content: unknown, title: string) => void;
}) {
  return (
    <div className={`result-item ${result.status}`} ref={cardRef}>
       <div className="result-header">
         <span className="result-test">{getTestDisplayName(result.test_id)}</span>
         <span className={`result-status ${result.status}`}>{result.status}</span>
       </div>
      <div className="result-severity">{result.severity}</div>
      {result.notes && <div className="result-notes">{result.notes}</div>}

      <ResultEvidence
        onViewRawEvidence={onViewRawEvidence}
        result={result}
        subdomain={subdomain}
      />

      {result.recommendations.length > 0 && (
        <div className="result-recommendations">
          <div className="recommendations-label">Recommendations:</div>
          {result.recommendations.map((recommendation, index) => (
            <div key={index} className="recommendation">
              {recommendation}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getResultGroupFromItem(item: ResultCardItem): ResultGroup {
  if (item.kind === 'group') {
    return item.group;
  }

  return {
    testId: item.result.test_id,
    results: [item.result],
    aggregateStatus: item.result.status,
  };
}

function getResultCardSummary(group: ResultGroup) {
  if (group.results.length > 1) {
    return `${group.results.length} observed results · ${formatStatusBreakdown(group.results)}`;
  }

  const [result] = group.results;
  const recommendationCount = result.recommendations.length;

  if (recommendationCount > 0) {
    return `${result.severity} severity · ${recommendationCount} recommendation${recommendationCount === 1 ? '' : 's'}`;
  }

  if (result.notes) {
    return `${result.severity} severity · includes additional notes`;
  }

  return `${result.severity} severity · one observed result`;
}

function SummaryResultCard({
  cardRef,
  group,
  onClick,
}: {
  cardRef?: (node: HTMLButtonElement | null) => void;
  group: ResultGroup;
  onClick: () => void;
}) {
  const itemCount = group.results.length;

  return (
    <button
      className={`result-item result-group-card ${group.aggregateStatus}`}
      onClick={onClick}
      ref={cardRef}
      type="button"
    >
      <div className="result-header">
        <span className="result-test">{getTestDisplayName(group.testId)}</span>
        <span className={`result-status ${group.aggregateStatus}`}>
          {group.aggregateStatus} · {itemCount} item{itemCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="result-severity">
        {itemCount === 1
          ? `${group.results[0].severity} severity`
          : `Grouped from ${itemCount} observed results`}
      </div>
      <div className="result-group-copy">{getResultCardSummary(group)}</div>
      <div className="result-group-copy">Click to inspect the full test detail.</div>
    </button>
  );
}

function SubdomainResultsMasonry({
  groupedResults,
  onOpenGroup,
  subdomain,
}: {
  groupedResults: ResultGroup[];
  onOpenGroup: (group: ResultGroup) => void;
  subdomain: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | HTMLDivElement | null>>({});
  const [columnCount, setColumnCount] = useState(1);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});

  const groupedResultsKey = groupedResults
    .map((group) => `${group.testId}:${group.results.map((result) => result.result_id).join(',')}`)
    .join('|');

  const items = useMemo(() => buildResultCardItems(groupedResults), [groupedResultsKey]);

  useEffect(() => {
    itemRefs.current = {};
    setMeasuredHeights({});
  }, [groupedResultsKey, subdomain]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateColumnCount = () => {
      setColumnCount(getResultColumnCount(element.clientWidth));
    };

    updateColumnCount();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateColumnCount);
      return () => window.removeEventListener('resize', updateColumnCount);
    }

    const observer = new ResizeObserver(() => updateColumnCount());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const nextMeasuredHeights: Record<string, number> = {};

    for (const item of items) {
      const element = itemRefs.current[item.key];
      if (!element) {
        continue;
      }

      nextMeasuredHeights[item.key] = Math.ceil(element.getBoundingClientRect().height);
    }

    setMeasuredHeights((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextMeasuredHeights);

      if (currentKeys.length !== nextKeys.length) {
        return nextMeasuredHeights;
      }

      for (const key of nextKeys) {
        if (current[key] !== nextMeasuredHeights[key]) {
          return nextMeasuredHeights;
        }
      }

      return current;
    });
  }, [columnCount, items]);

  const columns = distributeResultItems(items, columnCount, measuredHeights);

  const setItemRef = (key: string) => (node: HTMLButtonElement | HTMLDivElement | null) => {
    itemRefs.current[key] = node;
  };

  return (
    <div
      className="subdomain-results"
      ref={containerRef}
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((column, columnIndex) => (
        <div className="subdomain-results-column" key={`${subdomain}-column-${columnIndex}`}>
          {column.map((item) => {
            const group = getResultGroupFromItem(item);

            return (
              <SummaryResultCard
                cardRef={setItemRef(item.key)}
                group={group}
                key={item.key}
                onClick={() => onOpenGroup(group)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ResultsByTarget({ results, onViewRawEvidence }: ResultsByTargetProps) {
  const [expandedSubdomains, setExpandedSubdomains] = useState<Set<string>>(new Set());
  const [groupedResultsModal, setGroupedResultsModal] = useState<GroupedResultsModalState | null>(null);

  useEffect(() => {
    setExpandedSubdomains(new Set());
    setGroupedResultsModal(null);
  }, [results]);

  return (
    <>
      <div className="test-results">
        {Object.entries(groupResultsByTarget(results)).map(([subdomain, targetResults]) => {
          const isExpanded = expandedSubdomains.has(subdomain);
          const groupedResults = groupResultsByTestId(targetResults);

          return (
            <div key={subdomain} className="subdomain-group">
              <button
                className="subdomain-header-btn"
                onClick={() => {
                  const nextExpanded = new Set(expandedSubdomains);
                  if (isExpanded) {
                    nextExpanded.delete(subdomain);
                  } else {
                    nextExpanded.add(subdomain);
                  }
                  setExpandedSubdomains(nextExpanded);
                }}
                type="button"
              >
                <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                <h4 className="subdomain-header">{subdomain}</h4>
                <div className="status-summary">
                  {Object.entries(getStatusSummary(targetResults)).map(([status, count]) => (
                    <span key={status} className={`status-chip ${status}`} title={`${count} ${status}`}>
                      {count}
                    </span>
                  ))}
                </div>
              </button>

              {isExpanded && (
                <SubdomainResultsMasonry
                  groupedResults={groupedResults}
                  onOpenGroup={(group) => setGroupedResultsModal({ subdomain, group })}
                  subdomain={subdomain}
                />
              )}
            </div>
          );
        })}
      </div>

      {groupedResultsModal && (
        <div className="modal-overlay" onClick={() => setGroupedResultsModal(null)}>
          <div
            className="modal-content grouped-results-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                {getTestDisplayName(groupedResultsModal.group.testId)} · {groupedResultsModal.subdomain}
              </h3>
              <button
                className="modal-close"
                onClick={() => setGroupedResultsModal(null)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="grouped-results-body">
              <div className="grouped-results-copy">
                <p>
                  {getGroupedResultExplanation(
                    groupedResultsModal.group.testId,
                    groupedResultsModal.group.results.length
                  )}
                </p>
                <div className="grouped-results-status">
                  <span
                    className={`result-status ${groupedResultsModal.group.aggregateStatus}`}
                  >
                    {groupedResultsModal.group.aggregateStatus} ·{' '}
                    {groupedResultsModal.group.results.length} items
                  </span>
                  {Object.entries(getStatusSummary(groupedResultsModal.group.results)).map(
                    ([status, count]) => (
                      <span key={status} className={`status-chip ${status}`}>
                        {count} {status}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="grouped-results-list">
                {groupedResultsModal.group.results.map((result) => (
                  <SingleResultCard
                    key={result.result_id}
                    onViewRawEvidence={onViewRawEvidence}
                    result={result}
                    subdomain={groupedResultsModal.subdomain}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ResultsByTarget;
