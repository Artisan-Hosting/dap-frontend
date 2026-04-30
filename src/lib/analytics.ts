type PlausiblePrimitive = string | number | boolean;
type PlausibleProps = Record<string, PlausiblePrimitive>;

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: {
        props?: PlausibleProps;
        callback?: () => void;
      }
    ) => void;
  }
}

function getViewportBucket(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const width = window.innerWidth;
  if (width <= 640) {
    return 'mobile';
  }
  if (width <= 1100) {
    return 'tablet';
  }
  return 'desktop';
}

function getPathname(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.pathname;
}

function toNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function summarizeTarget(target: string) {
  const normalizedTarget = target.trim().toLowerCase();
  return {
    target_length: toNonNegativeInteger(normalizedTarget.length),
    label_count: normalizedTarget ? normalizedTarget.split('.').filter(Boolean).length : 0,
    hyphen_count: (normalizedTarget.match(/-/g) ?? []).length,
  };
}

export function trackEvent(eventName: string, props: PlausibleProps = {}) {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') {
    return;
  }

  window.plausible(eventName, {
    props: {
      pathname: getPathname(),
      viewport: getViewportBucket(),
      ...props,
    },
  });
}
