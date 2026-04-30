import { useEffect, useState, type FormEvent } from 'react';
import type { ContactRequestFormValues } from '../lib/contactRequest';

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
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isBlockedTarget = false; // Validation moved to audit form submission

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(formValues);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError((error as Error).message || 'Unable to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contact-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Want a human to look at it?</h3>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {isBlockedTarget ? (
          <div className="contact-success">
            <p>That looks like a lot of work, I&apos;ll pass.</p>
            <p className="contact-copy">
              This request is outside the scope of the follow-up service for this audit.
            </p>
            <button className="btn btn-primary" onClick={onClose} type="button">
              Close
            </button>
          </div>
        ) : isSubmitted ? (
          <div className="contact-success">
            <p>Thanks. We'll follow up about this audit.</p>
            <button className="btn btn-primary" onClick={onClose} type="button">
              Close
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <p className="contact-copy">
              These audits are extremely helpful for building testing and auditing infrastructure and
              making sure the right buttons are clicked and the wires are connected properly. They
              can also be overwhelming, so fill out the form below and tell us what you want to
              know about the tests. That can be an email exchange with people who know the stack, up
              to a 30 minute call about your infra, what you should pay attention to, and a set of
              actionable items to harden your domain.
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
              <button className="btn btn-secondary" onClick={onClose} type="button">
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
