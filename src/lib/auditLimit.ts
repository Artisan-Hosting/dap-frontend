declare global {
  interface Window {
    AUDIT_LIMIT_ENABLED?: boolean;
    AUDIT_LIMIT_MAX?: number;
  }
}

export const DEFAULT_AUDIT_LIMIT_ENABLED = true;
export const DEFAULT_AUDIT_LIMIT_MAX = 7;

export function getAuditLimitEnabled(): boolean {
  if (typeof window === 'undefined') {
    return DEFAULT_AUDIT_LIMIT_ENABLED;
  }

  return window.AUDIT_LIMIT_ENABLED ?? DEFAULT_AUDIT_LIMIT_ENABLED;
}

export function getAuditLimitMax(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_AUDIT_LIMIT_MAX;
  }

  return window.AUDIT_LIMIT_MAX ?? DEFAULT_AUDIT_LIMIT_MAX;
}
