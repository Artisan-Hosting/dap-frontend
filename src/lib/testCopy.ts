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

const TEST_DESCRIPTIONS: Record<string, string> = {
  web_basic_surface:
    'Looks at the basic shape of a web response, including server hints, framework clues, and other details that are visible from the outside.',
  ip_geolocation:
    'Shows where the IPs behind this host appear to be located, which can help explain CDN routing, regional delivery, or unexpected hosting regions.',
  ip_hosting_provider:
    'Tries to identify who is hosting or proxying the IPs behind this host so you can confirm traffic is landing where you expect.',
  web_security_headers:
    'Checks for common browser security headers that help reduce avoidable client-side risk.',
  ip_reputation_dnsbl:
    'Checks whether the host IPs appear on common blocklists, which can be a signal for email delivery or reputation problems.',
  web_hsts:
    'Checks whether browsers are being told to stick to HTTPS so visitors are less likely to end up on an insecure version of the site.',
  web_mixed_content:
    'Looks for HTTPS pages that still load some assets over HTTP, which can weaken browser protections and break trust indicators.',
  web_seo_basics:
    'Checks a few foundational search-facing basics like titles, descriptions, canonicals, and crawl signals.',
  dns_cname_chain:
    'Follows the DNS CNAME path for a host so you can see where it ultimately resolves and whether that chain looks expected.',
  psi_web_performance:
    'Runs a high-level performance check to show how quickly the site appears, becomes usable, and where speed may be getting lost.',
  email_probe:
    'Checks how the domain mail endpoints respond, including whether common ports are reachable and whether TLS or auth are advertised.',
  ssl_certificate:
    'Checks the TLS certificate presented by the site to confirm it matches the host and is not obviously expired or misconfigured.',
  dnssec_status:
    'Checks whether DNSSEC is enabled and whether the signed DNS chain looks intact.',
  dmarc:
    'Checks whether the domain publishes a DMARC policy to help receiving mail servers handle suspicious messages.',
  spf:
    'Checks whether the domain publishes an SPF record that says which systems are allowed to send email for it.',
  dkim:
    'Checks whether DKIM is in place so outgoing email can be signed and verified by receiving systems.',
};

function formatTestId(testId: string): string {
  return testId.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getTestDisplayName(testId: string): string {
  return TEST_DISPLAY_NAMES[testId] || formatTestId(testId);
}

export function getTestDescription(testId: string): string {
  return TEST_DESCRIPTIONS[testId] || 'Checks this part of the domain configuration and reports what was observed.';
}
