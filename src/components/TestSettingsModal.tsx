import { useEffect, useState } from 'react';
import type { SupportedTest } from '../types/api';
import { trackEvent } from '../lib/analytics';

interface TestSettingsModalProps {
  isOpen: boolean;
  tests: SupportedTest[];
  selectedTestIds: string[];
  onClose: () => void;
  onSave: (selectedTestIds: string[]) => void;
}

function isInternalTest(test: SupportedTest): boolean {
  return test.category === 'internal' || test.runtime === 'internal';
}

function getSelectionSummary(selectedIds: string[], tests: SupportedTest[]) {
  const internalIds = new Set(tests.filter(isInternalTest).map((test) => test.id));
  const internalSelectedCount = selectedIds.filter((testId) => internalIds.has(testId)).length;

  return {
    selected_count: selectedIds.length,
    available_count: tests.length,
    internal_selected_count: internalSelectedCount,
  };
}

export function TestSettingsModal({
  isOpen,
  tests,
  selectedTestIds,
  onClose,
  onSave,
}: TestSettingsModalProps) {
  const [draftSelection, setDraftSelection] = useState<string[]>(selectedTestIds);
  const [showInternalWarning, setShowInternalWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftSelection(selectedTestIds);
      setShowInternalWarning(false);
    }
  }, [isOpen, selectedTestIds]);

  if (!isOpen) {
    return null;
  }

  const supportedTestIds = tests.map((test) => test.id);

  if (showInternalWarning) {
    return (
      <div className="modal-overlay" onClick={() => setShowInternalWarning(false)}>
        <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Internal Tests Selected</h3>
            <button className="modal-close" onClick={() => setShowInternalWarning(false)} type="button">✕</button>
          </div>
          <div className="contact-form">
            <p className="contact-copy">
              These are really in-depth tests, they may take over 10 minutes to finish on larger domains.
            </p>
            <div className="contact-actions">
              <button className="btn btn-secondary" onClick={() => setShowInternalWarning(false)} type="button">
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  trackEvent('Test Selection Saved', {
                    save_mode: 'warning_acknowledged',
                    ...getSelectionSummary(draftSelection, tests),
                  });
                  setShowInternalWarning(false);
                }}
                type="button"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function persistSelection(nextSelection: string[], saveMode: 'normal' | 'bulk_update') {
    const filteredSelection = nextSelection.filter((testId) => supportedTestIds.includes(testId));
    const hasInternalSelected = filteredSelection.some((testId) => {
      const test = tests.find((candidate) => candidate.id === testId);
      return test ? isInternalTest(test) : false;
    });

    trackEvent('Test Selection Saved', {
      save_mode: saveMode,
      ...getSelectionSummary(filteredSelection, tests),
    });
    onSave(filteredSelection);

    if (hasInternalSelected) {
      trackEvent('Test Selection Warning Shown', {
        warning_type: 'internal_tests',
        ...getSelectionSummary(filteredSelection, tests),
      });
      setShowInternalWarning(true);
    }
  }

  function toggleTest(testId: string) {
    setDraftSelection((current) => {
      const nextSelection = current.includes(testId)
        ? current.filter((selectedId) => selectedId !== testId)
        : [...current, testId];
      const test = tests.find((candidate) => candidate.id === testId);

      trackEvent('Test Toggled', {
        test_id: testId,
        test_runtime: test?.runtime ?? 'unknown',
        selected: !current.includes(testId),
        ...getSelectionSummary(nextSelection, tests),
      });

      persistSelection(nextSelection, 'normal');
      return nextSelection;
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Select tests to run</h3>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="settings-body">
          <p className="contact-copy">
            Choose which supported backend tests to include in the next audit run.
          </p>

          <div className="settings-toolbar">
            <span className="settings-count">
              {draftSelection.length} of {tests.length} selected
            </span>
            <div className="settings-toolbar-actions">
              <button
                className="btn btn-small"
                onClick={() => {
                  setDraftSelection(supportedTestIds);
                  trackEvent('Test Selection Bulk Updated', {
                    action: 'select_all',
                    ...getSelectionSummary(supportedTestIds, tests),
                  });
                  persistSelection(supportedTestIds, 'bulk_update');
                }}
                type="button"
              >
                Select All
              </button>
              <button
                className="btn btn-small"
                onClick={() => {
                  setDraftSelection([]);
                  trackEvent('Test Selection Bulk Updated', {
                    action: 'clear_all',
                    ...getSelectionSummary([], tests),
                  });
                  persistSelection([], 'bulk_update');
                }}
                type="button"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="settings-list">
            {tests.map((test) => {
              const isSelected = draftSelection.includes(test.id);

              return (
                <label className="settings-item" key={test.id}>
                  <input
                    checked={isSelected}
                    onChange={() => toggleTest(test.id)}
                    type="checkbox"
                  />
                  <div className="settings-item-copy">
                    <div className="settings-item-header">
                      <span className="settings-item-name">{test.name}</span>
                      <span className="settings-item-id">{test.id}</span>
                    </div>
                    <span className="settings-item-meta">
                      {test.category} · {test.runtime} · {test.timeout_seconds}s timeout
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestSettingsModal;
