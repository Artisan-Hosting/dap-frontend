import { useEffect, useState, type FormEvent } from 'react';
import type { ContactRequestFormValues } from '../lib/contactRequest';
import { trackEvent } from '../lib/analytics';

interface ContactRequestModalProps {
  isOpen: boolean;
  runId: string;
  target: string;
  onClose: () => void;
  onSubmit: (values: ContactRequestFormValues) => Promise<void>;
}

const EMPTY_FORM: ContactRequestFormValues = {
  name: '',
  email: '',
  companyName: '',
  reasonOrGoal: '',
};

export function ContactRequestModal({
  isOpen,
  runId,
  target,
  onClose,
  onSubmit,
}: ContactRequestModalProps) {
  const [formValues, setFormValues] = useState<ContactRequestFormValues>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFormValues(EMPTY_FORM);
      setIsSubmitting(false);
      setIsSubmitted(false);
      setSubmitError(null);
      return;
    }

    trackEvent('Contact Modal Opened');
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isBlockedTarget = false; // Validation moved to audit form submission

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    trackEvent('Contact Request Submitted', {
      has_company_name: formValues.companyName.trim().length > 0,
      reason_length: formValues.reasonOrGoal.trim().length,
      name_length: formValues.name.trim().length,
    });

    try {
      await onSubmit(formValues);
      setIsSubmitted(true);
      trackEvent('Contact Request Succeeded');
    } catch (error) {
      setSubmitError((error as Error).message || 'Unable to submit request.');
      trackEvent('Contact Request Failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        trackEvent('Contact Modal Closed', {
          action: 'overlay',
        });
        onClose();
      }}
    >
      <div className="modal-content contact-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Want a human to look at it?</h3>
          <button
            className="modal-close"
            onClick={() => {
              trackEvent('Contact Modal Closed', {
                action: 'close_button',
              });
              onClose();
            }}
            type="button"
          >
            ✕
          </button>
        </div>

        {isBlockedTarget ? (
          <div className="contact-success">
            <p>That looks like a lot of work, I&apos;ll pass.</p>
            <p className="contact-copy">
              This request is outside the scope of the follow-up service for this audit.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                trackEvent('Contact Modal Closed', {
                  action: 'blocked_close',
                });
                onClose();
              }}
              type="button"
            >
              Close
            </button>
          </div>
        ) : isSubmitted ? (
          <div className="contact-success">
            <p>Thanks. We'll follow up about this audit.</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                trackEvent('Contact Modal Closed', {
                  action: 'success_close',
                });
                onClose();
              }}
              type="button"
            >
              Close
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <p className="contact-copy">
              These audits are incredibly useful for building, testing, and auditing infrastructure,
              and for making sure the right wires are connected and the right buttons are being
              pushed. That said, if you do not have a clear target or goal, they can get noisy fast
              and flag things your specific site may not actually need. If you want professional
              guidance or want someone to review your results and help prioritize what matters, fill
              out the form below. We will get your audit and your question, then reach out by email
              or with up to a 30 minute call about your infrastructure, what deserves attention,
              and the most actionable ways to harden your site.
            </p>

            <label className="contact-field">
              <span>Name</span>
              <input
                type="text"
                value={formValues.name}
                onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>

            <label className="contact-field">
              <span>Email</span>
              <input
                type="email"
                value={formValues.email}
                onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>

            <label className="contact-field">
              <span>Company Name</span>
              <input
                type="text"
                value={formValues.companyName}
                onChange={(event) => setFormValues((current) => ({ ...current, companyName: event.target.value }))}
                required
              />
            </label>

            <label className="contact-field">
              <span>Reason or Goal</span>
              <textarea
                rows={4}
                value={formValues.reasonOrGoal}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, reasonOrGoal: event.target.value }))
                }
                placeholder="Tell us what you want to understand, fix, or prioritize in these results."
                required
              />
            </label>

            <div className="contact-context">
              <span>Audit target: {target}</span>
              <span>Run ID: {runId}</span>
            </div>

            {submitError && <div className="error-message">{submitError}</div>}

            <div className="contact-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  trackEvent('Contact Modal Closed', {
                    action: 'cancel',
                  });
                  onClose();
                }}
                type="button"
              >
                Cancel
              </button>
              <button className="btn btn-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Submitting...' : 'Request Follow-up'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ContactRequestModal;
