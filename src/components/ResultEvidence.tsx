import type { Result } from '../types/api';

interface ResultEvidenceProps {
  result: Result;
  subdomain: string;
  onViewRawEvidence: (content: unknown, title: string) => void;
}

interface ParsedPsiMetric {
  key: string;
  label: string;
  display: string | null;
  score: number | null;
  value: number | null;
  unit: string | null;
}

interface ParsedPsiItem {
  id: string;
  title: string;
  description: string;
  displayValue: string | null;
  score: number | null;
  savingsMs: number | null;
  savingsBytes: number | null;
}

interface ParsedPsiDeviceReport {
  label: 'Mobile' | 'Desktop';
  performanceScore: number | null;
  metrics: ParsedPsiMetric[];
  improvements: ParsedPsiItem[];
  insights: ParsedPsiItem[];
  networkRtt: string | null;
  backendLatency: string | null;
}

interface ParsedPsiEvidence {
  mobile?: ParsedPsiDeviceReport;
  desktop?: ParsedPsiDeviceReport;
}

interface ParsedEmailMxHostDetail {
  host: string;
  preference: number | null;
  providerGuess: string | null;
  addresses: string[];
}

interface ParsedEmailProbe {
  host: string;
  port: number | null;
  service: string | null;
  reachable: boolean;
  implicitTls: boolean;
  supportsAuth: boolean;
  supportsStarttls: boolean;
  error: string | null;
  banner: string[];
}

interface ParsedEmailProbeEvidence {
  mxHosts: string[];
  mxHostDetails: ParsedEmailMxHostDetail[];
  probes: ParsedEmailProbe[];
  probedPorts: number[];
  tlsCapableListenerObserved: boolean | null;
}

interface ParsedServerFinding {
  family: string | null;
  server: string | null;
  version: string | null;
  signatureExposed: string | null;
  contentType: string | null;
}

interface ParsedWebBasicSurface {
  contentType: string | null;
  framework: string | null;
  frameworkSignals: string[];
  frontendIssues: string[];
  scheme: string | null;
  server: string | null;
  serverFindings: ParsedServerFinding[];
  sourceMaps: string[];
  statusCode: number | null;
  xPoweredBy: string | null;
}

interface ParsedIpGeolocation {
  city: string | null;
  country: string | null;
  host: string | null;
  ip: string | null;
  loc: string | null;
  postal: string | null;
  region: string | null;
  timezone: string | null;
  ips: string[];
  observations: ParsedIpGeolocation[];
}

interface ParsedIpHostingProvider {
  asn: string | null;
  cloudflareProxy: boolean;
  commonCloudProvider: string | null;
  host: string | null;
  ip: string | null;
  ips: string[];
  organization: string | null;
  provider: string | null;
  providers: string[];
  observations: ParsedIpHostingProvider[];
}

interface ParsedWebSecurityHeaders {
  coepPresent: string | null;
  coopPresent: string | null;
  corpPresent: string | null;
  cspPresent: string | null;
  hstsPresent: string | null;
  permpolPresent: string | null;
  refpolPresent: string | null;
  xctoPresent: string | null;
  xfoPresent: string | null;
}

interface ParsedDnsblListing {
  answers: string[];
  list: string | null;
  zone: string | null;
}

interface ParsedIpReputationDnsbl {
  checkedLists: string[];
  host: string | null;
  ip: string | null;
  ips: string[];
  listed: ParsedDnsblListing[];
  family: string | null;
  observations: ParsedIpReputationDnsbl[];
}

interface ParsedWebHsts {
  certDaysLeft: number | null;
  hstsHeader: string | null;
  httpRedirectsToHttps: boolean;
  httpsStatus: number | null;
}

interface ParsedWebMixedContent {
  hosts: string[];
  httpReferenceCount: number | null;
}

interface ParsedWebSeoBasics {
  hasCanonical: boolean;
  hreflangPresent: boolean;
  infoIssues: string[];
  licensePresent: boolean;
  metaDescriptionLength: number | null;
  ogTagsPresent: boolean;
  readmePresent: boolean;
  robotsTxtOk: boolean;
  scheme: string | null;
  sitemapOk: boolean;
  statusCode: number | null;
  titleLength: number | null;
  twitterCardPresent: boolean;
  warnIssues: string[];
}

interface ParsedDnsCnameChainLink {
  from: string | null;
  to: string | null;
}

interface ParsedDnsCnameChain {
  addresses: string[];
  chain: ParsedDnsCnameChainLink[];
  depth: number | null;
  terminal: string | null;
}

interface PsiActionItem {
  id: string;
  title: string;
  detail: string;
  tone: 'good' | 'warn' | 'bad';
}

const PSI_METRICS = [
  { key: 'largest_contentful_paint', label: 'LCP' },
  { key: 'first_contentful_paint', label: 'FCP' },
  { key: 'cumulative_layout_shift', label: 'CLS' },
  { key: 'speed_index', label: 'Speed Index' },
  { key: 'total_blocking_time', label: 'TBT' },
  { key: 'interaction_to_next_paint', label: 'INP' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getMetric(device: ParsedPsiDeviceReport, metricKey: string): ParsedPsiMetric | undefined {
  return device.metrics.find((metric) => metric.key === metricKey);
}

function parsePsiItem(value: unknown): ParsedPsiItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getString(value.id);
  const title = getString(value.title);
  const description = getString(value.description);

  if (!id || !title || !description) {
    return null;
  }

  return {
    id,
    title,
    description,
    displayValue: getString(value.display_value),
    score: getNumber(value.score),
    savingsMs: getNumber(value.savings_ms),
    savingsBytes: getNumber(value.savings_bytes),
  };
}

function parsePsiDeviceReport(label: 'Mobile' | 'Desktop', value: unknown): ParsedPsiDeviceReport | null {
  if (!isRecord(value)) {
    return null;
  }

  const metricsSource = isRecord(value.metrics) ? value.metrics : {};
  const metrics = PSI_METRICS.map(({ key, label: metricLabel }) => {
    const metricValue = isRecord(metricsSource[key]) ? metricsSource[key] : null;

    return {
      key,
      label: metricLabel,
      display: metricValue ? getString(metricValue.display) : null,
      score: metricValue ? getNumber(metricValue.score) : null,
      value: metricValue ? getNumber(metricValue.value) : null,
      unit: metricValue ? getString(metricValue.unit) : null,
    };
  }).filter((metric) => metric.display || metric.value !== null);

  const improvements = getArray(value.improvements)
    .map(parsePsiItem)
    .filter((item): item is ParsedPsiItem => item !== null);

  const insights = getArray(value.insights)
    .map(parsePsiItem)
    .filter((item): item is ParsedPsiItem => item !== null);

  const networkRtt = insights.find((item) => item.id === 'network-rtt')?.displayValue ?? null;
  const backendLatency = insights.find((item) => item.id === 'network-server-latency')?.displayValue ?? null;

  return {
    label,
    performanceScore: getNumber(value.performance_score),
    metrics,
    improvements,
    insights,
    networkRtt,
    backendLatency,
  };
}

function parsePsiEvidence(value: unknown): ParsedPsiEvidence | null {
  if (!isRecord(value)) {
    return null;
  }

  const mobile = parsePsiDeviceReport('Mobile', value.mobile);
  const desktop = parsePsiDeviceReport('Desktop', value.desktop);

  if (!mobile && !desktop) {
    return null;
  }

  return {
    ...(mobile ? { mobile } : {}),
    ...(desktop ? { desktop } : {}),
  };
}

function parseEmailProbeEvidence(value: unknown): ParsedEmailProbeEvidence | null {
  if (!isRecord(value)) {
    return null;
  }

  const mxHosts = getArray(value.mx_hosts).filter(
    (host): host is string => typeof host === 'string'
  );

  const probedPorts = getArray(value.probed_ports).filter(
    (port): port is number => typeof port === 'number'
  );

  const mxHostDetails = getArray(value.mx_host_details)
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const host = getString(item.host);
      if (!host) {
        return null;
      }

      return {
        host,
        preference: getNumber(item.preference),
        providerGuess: getString(item.provider_guess),
        addresses: getArray(item.addresses).filter(
          (address): address is string => typeof address === 'string'
        ),
      };
    })
    .filter((item): item is ParsedEmailMxHostDetail => item !== null);

  const probes = getArray(value.probes)
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const host = getString(item.host);
      if (!host) {
        return null;
      }

      return {
        host,
        port: getNumber(item.port),
        service: getString(item.service),
        reachable: item.reachable === true,
        implicitTls: item.implicit_tls === true,
        supportsAuth: item.supports_auth === true,
        supportsStarttls: item.supports_starttls === true,
        error: getString(item.error),
        banner: getArray(item.banner).filter((banner): banner is string => typeof banner === 'string'),
      };
    })
    .filter((item): item is ParsedEmailProbe => item !== null);

  if (mxHosts.length === 0 && mxHostDetails.length === 0 && probes.length === 0) {
    return null;
  }

  return {
    mxHosts,
    mxHostDetails,
    probes,
    probedPorts,
    tlsCapableListenerObserved:
      typeof value.tls_capable_listener_observed === 'boolean'
        ? value.tls_capable_listener_observed
        : null,
  };
}

function parseWebBasicSurface(value: unknown): ParsedWebBasicSurface | null {
  if (!isRecord(value)) {
    return null;
  }

  const serverFindings = getArray(value.server_findings)
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        family: getString(item.family),
        server: getString(item.server),
        version: getString(item.version),
        signatureExposed: getString(item.signature_exposed),
        contentType: getString(item.content_type),
      };
    })
    .filter((item): item is ParsedServerFinding => item !== null);

  const parsedEvidence: ParsedWebBasicSurface = {
    contentType: getString(value.content_type),
    framework: getString(value.framework),
    frameworkSignals: getArray(value.framework_signals).filter(
      (signal): signal is string => typeof signal === 'string'
    ),
    frontendIssues: getArray(value.frontend_issues).filter(
      (issue): issue is string => typeof issue === 'string'
    ),
    scheme: getString(value.scheme),
    server: getString(value.server),
    serverFindings,
    sourceMaps: getArray(value.source_maps).filter(
      (map): map is string => typeof map === 'string'
    ),
    statusCode: getNumber(value.status_code),
    xPoweredBy: getString(value.x_powered_by),
  };

  const hasSurfaceData =
    parsedEvidence.contentType !== null ||
    parsedEvidence.framework !== null ||
    parsedEvidence.frameworkSignals.length > 0 ||
    parsedEvidence.frontendIssues.length > 0 ||
    parsedEvidence.scheme !== null ||
    parsedEvidence.server !== null ||
    parsedEvidence.serverFindings.length > 0 ||
    parsedEvidence.sourceMaps.length > 0 ||
    parsedEvidence.statusCode !== null ||
    parsedEvidence.xPoweredBy !== null;

  return hasSurfaceData ? parsedEvidence : null;
}

function parseIpGeolocation(value: unknown): ParsedIpGeolocation | null {
  if (!isRecord(value)) {
    return null;
  }

  const ips = getArray(value.ips).filter((item): item is string => typeof item === 'string');
  const observations = getArray(value.observations)
    .map((observation) => parseIpGeolocation(observation))
    .filter((item): item is ParsedIpGeolocation => item !== null);

  const parsedData: ParsedIpGeolocation = {
    city: getString(value.city),
    country: getString(value.country),
    host: getString(value.host),
    ip: getString(value.ip),
    loc: getString(value.loc),
    postal: getString(value.postal),
    region: getString(value.region),
    timezone: getString(value.timezone),
    ips,
    observations,
  };

  const hasData =
    parsedData.city !== null ||
    parsedData.country !== null ||
    parsedData.host !== null ||
    parsedData.ip !== null ||
    parsedData.loc !== null ||
    parsedData.postal !== null ||
    parsedData.region !== null ||
    parsedData.timezone !== null ||
    parsedData.ips.length > 0 ||
    parsedData.observations.length > 0;
  return hasData ? parsedData : null;
}

function parseIpHostingProvider(value: unknown): ParsedIpHostingProvider | null {
  if (!isRecord(value)) {
    return null;
  }

  const asn = getString(value.asn);
  const organization = getString(value.organization);
  const ips = getArray(value.ips).filter((item): item is string => typeof item === 'string');
  const providers = getArray(value.providers).filter((item): item is string => typeof item === 'string');
  const observations = getArray(value.observations)
    .map((item) => parseIpHostingProvider(item))
    .filter((item): item is ParsedIpHostingProvider => item !== null);
  const provider =
    asn === 'AS394621 Stack41, llc.' || organization === 'AS394621 Stack41, llc.'
      ? 'Artisan Hosting'
      : getString(value.provider);

  const parsedData: ParsedIpHostingProvider = {
    asn,
    cloudflareProxy: value.cloudflare_proxy === true,
    commonCloudProvider: getString(value.common_cloud_provider),
    host: getString(value.host),
    ip: getString(value.ip),
    ips,
    organization,
    provider,
    providers,
    observations,
  };

  const hasData =
    parsedData.asn !== null ||
    parsedData.cloudflareProxy ||
    parsedData.commonCloudProvider !== null ||
    parsedData.host !== null ||
    parsedData.ip !== null ||
    parsedData.ips.length > 0 ||
    parsedData.organization !== null ||
    parsedData.provider !== null ||
    parsedData.providers.length > 0 ||
    parsedData.observations.length > 0;

  return hasData ? parsedData : null;
}

function parseWebSecurityHeaders(value: unknown): ParsedWebSecurityHeaders | null {
  if (!isRecord(value)) {
    return null;
  }

  const parsedData: ParsedWebSecurityHeaders = {
    coepPresent: getString(value.coep_present),
    coopPresent: getString(value.coop_present),
    corpPresent: getString(value.corp_present),
    cspPresent: getString(value.csp_present),
    hstsPresent: getString(value.hsts_present),
    permpolPresent: getString(value.permpol_present),
    refpolPresent: getString(value.refpol_present),
    xctoPresent: getString(value.xcto_present),
    xfoPresent: getString(value.xfo_present),
  };

  return parsedData;
}

function parseIpReputationDnsbl(value: unknown): ParsedIpReputationDnsbl | null {
  if (!isRecord(value)) {
    return null;
  }

  const checkedLists = getArray(value.checked_lists).filter(
    (list): list is string => typeof list === 'string'
  );

  const ips = getArray(value.ips).filter((ip): ip is string => typeof ip === 'string');

  const listed = getArray(value.listed)
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        answers: getArray(item.answers).filter(
          (answer): answer is string => typeof answer === 'string'
        ),
        list: getString(item.list),
        zone: getString(item.zone),
      };
    })
    .filter((item): item is ParsedDnsblListing => item !== null);

  const observations = getArray(value.observations)
    .map((item) => parseIpReputationDnsbl(item))
    .filter((item): item is ParsedIpReputationDnsbl => item !== null);

  const parsedData: ParsedIpReputationDnsbl = {
    checkedLists,
    host: getString(value.host),
    ip: getString(value.ip),
    ips,
    listed,
    family: getString(value.family),
    observations,
  };

  const hasData =
    parsedData.checkedLists.length > 0 ||
    parsedData.host !== null ||
    parsedData.ip !== null ||
    parsedData.ips.length > 0 ||
    parsedData.listed.length > 0 ||
    parsedData.family !== null ||
    parsedData.observations.length > 0;

  return hasData ? parsedData : null;
}

function parseWebHsts(value: unknown): ParsedWebHsts | null {
  if (!isRecord(value)) {
    return null;
  }

  const parsedData: ParsedWebHsts = {
    certDaysLeft: getNumber(value.cert_days_left),
    hstsHeader: getString(value.hsts_header),
    httpRedirectsToHttps: value.http_redirects_to_https === true,
    httpsStatus: getNumber(value.https_status),
  };

  const hasData =
    parsedData.certDaysLeft !== null ||
    parsedData.hstsHeader !== null ||
    parsedData.httpRedirectsToHttps ||
    parsedData.httpsStatus !== null;

  return hasData ? parsedData : null;
}

function parseWebMixedContent(value: unknown): ParsedWebMixedContent | null {
  if (!isRecord(value)) {
    return null;
  }

  const hosts = getArray(value.hosts).filter((host): host is string => typeof host === 'string');
  const httpReferenceCount = getNumber(value.http_reference_count);

  const parsedData: ParsedWebMixedContent = {
    hosts,
    httpReferenceCount,
  };

  const hasData = parsedData.hosts.length > 0 || parsedData.httpReferenceCount !== null;

  return hasData ? parsedData : null;
}

function parseWebSeoBasics(value: unknown): ParsedWebSeoBasics | null {
  if (!isRecord(value)) {
    return null;
  }

  const infoIssues = getArray(value.info_issues).filter(
    (issue): issue is string => typeof issue === 'string'
  );

  const warnIssues = getArray(value.warn_issues).filter(
    (issue): issue is string => typeof issue === 'string'
  );

  const parsedData: ParsedWebSeoBasics = {
    hasCanonical: value.has_canonical === true,
    hreflangPresent: value.hreflang_present === true,
    infoIssues,
    licensePresent: value.license_present === true,
    metaDescriptionLength: getNumber(value.meta_description_length),
    ogTagsPresent: value.og_tags_present === true,
    readmePresent: value.readme_present === true,
    robotsTxtOk: value.robots_txt_ok === true,
    scheme: getString(value.scheme),
    sitemapOk: value.sitemap_ok === true,
    statusCode: getNumber(value.status_code),
    titleLength: getNumber(value.title_length),
    twitterCardPresent: value.twitter_card_present === true,
    warnIssues,
  };

  const hasData =
    parsedData.statusCode !== null ||
    parsedData.titleLength !== null ||
    parsedData.metaDescriptionLength !== null ||
    infoIssues.length > 0 ||
    warnIssues.length > 0;

  return hasData ? parsedData : null;
}

function parseDnsCnameChain(value: unknown): ParsedDnsCnameChain | null {
  if (!isRecord(value)) {
    return null;
  }

  const addresses = getArray(value.addresses).filter(
    (addr): addr is string => typeof addr === 'string'
  );

  const chain = getArray(value.chain)
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        from: getString(item.from),
        to: getString(item.to),
      };
    })
    .filter((item): item is ParsedDnsCnameChainLink => item !== null);

  const parsedData: ParsedDnsCnameChain = {
    addresses,
    chain,
    depth: getNumber(value.depth),
    terminal: getString(value.terminal),
  };

  const hasData =
    parsedData.addresses.length > 0 ||
    parsedData.chain.length > 0 ||
    parsedData.depth !== null ||
    parsedData.terminal !== null;

  return hasData ? parsedData : null;
}

function getScoreTone(score: number | null): 'good' | 'warn' | 'bad' {
  if (score === null) {
    return 'warn';
  }

  if (score >= 0.9) {
    return 'good';
  }

  if (score >= 0.5) {
    return 'warn';
  }

  return 'bad';
}

function parseDisplayNumber(displayValue: string | null): number | null {
  if (!displayValue) {
    return null;
  }

  const match = displayValue.match(/([\d.]+)/);
  return match ? Number(match[1]) : null;
}

function buildPsiActionItems(parsedEvidence: ParsedPsiEvidence): PsiActionItem[] {
  const devices = [parsedEvidence.mobile, parsedEvidence.desktop].filter(
    (device): device is ParsedPsiDeviceReport => device !== undefined
  );

  const actions: PsiActionItem[] = [];

  for (const device of devices) {
    const lcp = getMetric(device, 'largest_contentful_paint');
    const lcpValue = lcp?.value;
    if (lcpValue !== null && lcpValue !== undefined && lcpValue > 2500) {
      actions.push({
        id: `${device.label}-lcp`,
        title: `${device.label} LCP is slow`,
        detail: `${lcp?.display ?? `${Math.round(lcpValue)} ms`} suggests the main content is arriving late. Prioritize the hero resource, preload critical assets, and trim render-blocking work.`,
        tone: lcpValue > 4000 ? 'bad' : 'warn',
      });
    }

    const cls = getMetric(device, 'cumulative_layout_shift');
    const clsValue = cls?.value;
    if (clsValue !== null && clsValue !== undefined && clsValue > 0.1) {
      actions.push({
        id: `${device.label}-cls`,
        title: `${device.label} layout is shifting`,
        detail: `${cls?.display ?? clsValue.toFixed(3)} means users may see content jump. Reserve space for images, embeds, banners, and any lazy-injected sections.`,
        tone: clsValue > 0.25 ? 'bad' : 'warn',
      });
    }

    const fcp = getMetric(device, 'first_contentful_paint');
    const fcpValue = fcp?.value;
    if (fcpValue !== null && fcpValue !== undefined && fcpValue > 1800) {
      actions.push({
        id: `${device.label}-fcp`,
        title: `${device.label} first paint can start earlier`,
        detail: `${fcp?.display ?? `${Math.round(fcpValue)} ms`} points to slow critical-path delivery. Reduce blocking CSS/JS and make sure the first visible content is lightweight.`,
        tone: 'warn',
      });
    }

    const tbt = getMetric(device, 'total_blocking_time');
    const tbtValue = tbt?.value;
    if (tbtValue !== null && tbtValue !== undefined && tbtValue > 200) {
      actions.push({
        id: `${device.label}-tbt`,
        title: `${device.label} main thread is doing too much`,
        detail: `${tbt?.display ?? `${Math.round(tbtValue)} ms`} of blocking time suggests heavy scripting. Break up long tasks and defer non-critical JavaScript.`,
        tone: tbtValue > 600 ? 'bad' : 'warn',
      });
    }

    const backendLatencyValue = parseDisplayNumber(device.backendLatency);
    if (backendLatencyValue !== null && backendLatencyValue > 150) {
      actions.push({
        id: `${device.label}-backend-latency`,
        title: `${device.label} backend latency is noticeable`,
        detail: `${device.backendLatency} server latency can slow down page delivery. Check origin processing time, caching, and upstream dependencies.`,
        tone: backendLatencyValue > 300 ? 'bad' : 'warn',
      });
    }

    const longTaskInsight = device.insights.find((item) => item.id === 'long-tasks');
    if (longTaskInsight?.displayValue && !longTaskInsight.displayValue.startsWith('0')) {
      actions.push({
        id: `${device.label}-long-tasks`,
        title: `${device.label} has long main-thread work`,
        detail: `${longTaskInsight.displayValue}. Audit expensive scripts and split long tasks so the UI stays responsive.`,
        tone: 'warn',
      });
    }

    for (const improvement of device.improvements) {
      if (
        (improvement.score !== null && improvement.score < 1) ||
        (improvement.savingsMs ?? 0) > 0 ||
        (improvement.savingsBytes ?? 0) > 0
      ) {
        actions.push({
          id: `${device.label}-${improvement.id}`,
          title: `${device.label}: ${improvement.title}`,
          detail: improvement.description,
          tone: 'warn',
        });
      }
    }
  }

  const dedupedActions = actions.filter(
    (action, index) => actions.findIndex((candidate) => candidate.id === action.id) === index
  );

  if (dedupedActions.length === 0) {
    return [
      {
        id: 'psi-healthy',
        title: 'No major PSI issues stood out in this payload',
        detail: 'The structured Lighthouse output looks healthy overall. Review the raw report if you want the full detail behind the scores.',
        tone: 'good',
      },
    ];
  }

  return dedupedActions.slice(0, 6);
}

function buildEmailProbeActionItems(parsedEvidence: ParsedEmailProbeEvidence): PsiActionItem[] {
  const actions: PsiActionItem[] = [];
  const submissionProbe = parsedEvidence.probes.find((probe) => probe.port === 587);
  const smtpsProbe = parsedEvidence.probes.find((probe) => probe.port === 465);
  const smtpProbe = parsedEvidence.probes.find((probe) => probe.port === 25);

  if (parsedEvidence.mxHosts.length === 0) {
    actions.push({
      id: 'email-mx-missing',
      title: 'No MX hosts were identified',
      detail: 'Mail routing could not be confirmed from the parsed evidence. Recheck DNS and MX resolution before relying on inbound email.',
      tone: 'bad',
    });
  }

  if (parsedEvidence.tlsCapableListenerObserved === false) {
    actions.push({
      id: 'email-no-tls',
      title: 'No TLS-capable SMTP listener was observed',
      detail: 'Expose STARTTLS or implicit TLS on a mail listener so mail clients and relays can negotiate encrypted transport.',
      tone: 'bad',
    });
  }

  if (smtpProbe && smtpProbe.reachable && !smtpProbe.supportsStarttls) {
    actions.push({
      id: 'email-smtp-no-starttls',
      title: 'Port 25 is reachable but does not advertise STARTTLS',
      detail: 'Enable STARTTLS on the primary SMTP listener to improve transport security for inbound and relay traffic.',
      tone: 'warn',
    });
  }

  if (submissionProbe && submissionProbe.reachable && !submissionProbe.supportsAuth) {
    actions.push({
      id: 'email-submission-no-auth',
      title: 'Submission port 587 is reachable without AUTH support',
      detail: 'If this listener is meant for authenticated mail clients, advertise AUTH so users can submit mail securely.',
      tone: 'warn',
    });
  }

  if (smtpsProbe && smtpsProbe.reachable) {
    actions.push({
      id: 'email-smtps-good',
      title: 'Implicit TLS mail submission is available on port 465',
      detail: 'That gives users a secure client submission option. Keep certificates and auth policy aligned with your client configuration docs.',
      tone: 'good',
    });
  }

  const unreachableStandardPorts = parsedEvidence.probes.filter(
    (probe) => probe.port !== 2525 && !probe.reachable && probe.error
  );
  for (const probe of unreachableStandardPorts) {
    actions.push({
      id: `email-unreachable-${probe.port}`,
      title: `${probe.service ?? 'Mail service'} on port ${probe.port ?? 'unknown'} is unreachable`,
      detail: probe.error ?? 'The listener could not be reached.',
      tone: 'warn',
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'email-healthy',
      title: 'The parsed mail listener data looks healthy overall',
      detail: 'Use the listener summary below to verify the exposed ports and auth/TLS behavior match how this mail stack is supposed to operate.',
      tone: 'good',
    });
  }

  return actions.slice(0, 6);
}

function renderRawEvidenceButton(
  content: unknown,
  title: string,
  onViewRawEvidence: (content: unknown, title: string) => void,
  lineCount: number
) {
  return (
    <button className="btn btn-small" onClick={() => onViewRawEvidence(content, title)} type="button">
      View raw evidence ({lineCount} lines)
    </button>
  );
}

function PsiPerformanceEvidence({
  evidence,
  subdomain,
  onViewRawEvidence,
}: {
  evidence: unknown;
  subdomain: string;
  onViewRawEvidence: (content: unknown, title: string) => void;
}) {
  const parsedEvidence = parsePsiEvidence(evidence);
  const rawEvidence = JSON.stringify(evidence, null, 2);
  const rawLineCount = rawEvidence.split('\n').length;

  if (!parsedEvidence) {
    return renderRawEvidenceButton(evidence, `${subdomain} - psi_web_performance`, onViewRawEvidence, rawLineCount);
  }

  const devices = [parsedEvidence.mobile, parsedEvidence.desktop].filter(
    (device): device is ParsedPsiDeviceReport => device !== undefined
  );
  const actionItems = buildPsiActionItems(parsedEvidence);

  return (
    <div className="psi-evidence">
      <div className="psi-actions">
        <div className="psi-section-heading">What to work on</div>
        <div className="psi-action-list">
          {actionItems.map((actionItem) => (
            <div className={`psi-action-item ${actionItem.tone}`} key={actionItem.id}>
              <div className="psi-action-title">{actionItem.title}</div>
              <div className="psi-action-detail">{actionItem.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="psi-device-grid">
        {devices.map((device) => {
          const scoreTone = getScoreTone(device.performanceScore);
          const scoreValue = device.performanceScore === null ? 'N/A' : `${Math.round(device.performanceScore * 100)}`;

          return (
            <div className="psi-device-card" key={device.label}>
              <div className="psi-device-header">
                <div>
                  <div className="psi-device-label">{device.label}</div>
                  <div className="psi-device-subtitle">Performance score and key vitals</div>
                </div>
                <div className={`psi-score-badge ${scoreTone}`}>
                  <span className="psi-score-value">{scoreValue}</span>
                  <span className="psi-score-label">score</span>
                </div>
              </div>

              <div className="psi-metrics-grid">
                {device.metrics.map((metric) => (
                  <div className={`psi-metric-card ${getScoreTone(metric.score)}`} key={`${device.label}-${metric.key}`}>
                    <span className="psi-metric-label">{metric.label}</span>
                    <span className="psi-metric-value">{metric.display ?? 'N/A'}</span>
                  </div>
                ))}
              </div>

              {(device.networkRtt || device.backendLatency) && (
                <div className="psi-latency-row">
                  {device.networkRtt && <span className="tag"><b>RTT</b>{device.networkRtt}</span>}
                  {device.backendLatency && <span className="tag"><b>Backend</b>{device.backendLatency}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - psi_web_performance`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function EmailProbeEvidence({
  evidence,
  subdomain,
  onViewRawEvidence,
}: {
  evidence: unknown;
  subdomain: string;
  onViewRawEvidence: (content: unknown, title: string) => void;
}) {
  const parsedEvidence = parseEmailProbeEvidence(evidence);
  const rawEvidence = JSON.stringify(evidence, null, 2);
  const rawLineCount = rawEvidence.split('\n').length;

  if (!parsedEvidence) {
    return renderRawEvidenceButton(evidence, `${subdomain} - email_probe`, onViewRawEvidence, rawLineCount);
  }

  const reachableProbeCount = parsedEvidence.probes.filter((probe) => probe.reachable).length;
  const actionItems = buildEmailProbeActionItems(parsedEvidence);

  return (
    <div className="psi-evidence">
      <div className="psi-actions">
        <div className="psi-section-heading">What to look at</div>
        <div className="psi-action-list">
          {actionItems.map((actionItem) => (
            <div className={`psi-action-item ${actionItem.tone}`} key={actionItem.id}>
              <div className="psi-action-title">{actionItem.title}</div>
              <div className="psi-action-detail">{actionItem.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="psi-overview-grid">
        <div className="psi-overview-card">
          <span className="psi-overview-label">MX hosts</span>
          <span className="psi-overview-value">{parsedEvidence.mxHosts.length}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Reachable listeners</span>
          <span className="psi-overview-value">
            {reachableProbeCount}/{parsedEvidence.probes.length}
          </span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">TLS-capable listener</span>
          <span className="psi-overview-value">
            {parsedEvidence.tlsCapableListenerObserved ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {parsedEvidence.mxHostDetails.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">MX routing</div>
          <div className="psi-list-grid">
            {parsedEvidence.mxHostDetails.map((hostDetail) => (
              <div className="psi-list-card" key={`${hostDetail.host}-${hostDetail.preference ?? 'na'}`}>
                <div className="psi-list-card-title">{hostDetail.host}</div>
                <div className="psi-list-card-copy">
                  Preference: {hostDetail.preference ?? 'N/A'}
                </div>
                {hostDetail.providerGuess && (
                  <div className="psi-list-card-copy">Provider guess: {hostDetail.providerGuess}</div>
                )}
                {hostDetail.addresses.length > 0 && (
                  <div className="psi-list-card-copy">Addresses: {hostDetail.addresses.join(', ')}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="psi-section-block">
        <div className="psi-section-heading">Listener checks</div>
        <div className="psi-list-grid">
          {parsedEvidence.probes.map((probe) => (
            <div className={`psi-list-card ${probe.reachable ? 'good' : 'bad'}`} key={`${probe.host}-${probe.port}`}>
              <div className="psi-list-card-title">
                {probe.service ?? 'smtp'} · {probe.port ?? 'N/A'}
              </div>
              <div className="psi-list-card-copy">Host: {probe.host}</div>
              <div className="psi-list-card-copy">Reachable: {probe.reachable ? 'Yes' : 'No'}</div>
              <div className="psi-list-card-copy">Implicit TLS: {probe.implicitTls ? 'Yes' : 'No'}</div>
              <div className="psi-list-card-copy">STARTTLS: {probe.supportsStarttls ? 'Yes' : 'No'}</div>
              <div className="psi-list-card-copy">AUTH: {probe.supportsAuth ? 'Yes' : 'No'}</div>
              {probe.banner[0] && <div className="psi-list-card-copy">Banner: {probe.banner[0]}</div>}
              {probe.error && <div className="psi-list-card-copy">Error: {probe.error}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - email_probe`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function WebBasicSurfaceEvidence({
  evidence,
  onViewRawEvidence,
  subdomain,
}: {
  evidence: unknown;
  onViewRawEvidence: (content: unknown, title: string) => void;
  subdomain: string;
}) {
  const parsedEvidence = parseWebBasicSurface(evidence);
  if (!parsedEvidence) {
    return null;
  }

  const rawLineCount = JSON.stringify(evidence, null, 2).split('\n').length;

  // Determine if HTTPS is enabled
  const isHttps = parsedEvidence.scheme === 'https';

  return (
    <div className="psi-evidence">
      <div className="psi-overview-grid">
        <div className="psi-overview-card">
          <span className="psi-overview-label">Status Code</span>
          <span className="psi-overview-value">
            {parsedEvidence.statusCode ?? 'N/A'}
          </span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Protocol</span>
          <span className="psi-overview-value">
            {parsedEvidence.scheme?.toUpperCase() ?? 'N/A'}
          </span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Server</span>
          <span className="psi-overview-value">
            {parsedEvidence.server ?? 'Unknown'}
          </span>
        </div>
        {parsedEvidence.framework && (
          <div className="psi-overview-card">
            <span className="psi-overview-label">Framework</span>
            <span className="psi-overview-value">
              {parsedEvidence.framework}
            </span>
          </div>
        )}
      </div>

      {parsedEvidence.serverFindings.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Server Findings</div>
          <div className="psi-list-grid">
            {parsedEvidence.serverFindings.map((finding, index) => (
              <div className="psi-list-card" key={index}>
                {finding.server && (
                  <div className="psi-list-card-title">
                    {finding.server} {finding.version ? `(${finding.version})` : ''}
                  </div>
                )}
                {finding.family && (
                  <div className="psi-list-card-copy">Family: {finding.family}</div>
                )}
                {finding.signatureExposed && (
                  <div className="psi-list-card-copy">
                    Signature: {finding.signatureExposed}
                  </div>
                )}
                {finding.contentType && (
                  <div className="psi-list-card-copy">
                    Content-Type: {finding.contentType}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.frameworkSignals.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Framework Signals</div>
          <div className="psi-list-grid">
            {parsedEvidence.frameworkSignals.map((signal, index) => (
              <div className="psi-list-card" key={index}>
                <div className="psi-list-card-copy">{signal}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.frontendIssues.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Frontend Issues</div>
          <div className="psi-list-grid">
            {parsedEvidence.frontendIssues.map((issue, index) => (
              <div className="psi-list-card bad" key={index}>
                <div className="psi-list-card-copy">{issue}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.sourceMaps.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Source Maps</div>
          <div className="psi-list-grid">
            {parsedEvidence.sourceMaps.map((map, index) => (
              <div className="psi-list-card" key={index}>
                <div className="psi-list-card-copy">{map}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="psi-section-block">
        <div className="psi-section-heading">Additional Details</div>
        <div className="psi-list-grid">
          <div className="psi-list-card">
            <div className="psi-list-card-title">Response Headers</div>
            <div className="psi-list-card-copy">
              Content-Type: {parsedEvidence.contentType ?? 'Not specified'}
            </div>
            {parsedEvidence.xPoweredBy && (
              <div className="psi-list-card-copy">
                X-Powered-By: {parsedEvidence.xPoweredBy}
              </div>
            )}
          </div>
          <div className={`psi-list-card ${isHttps ? 'good' : 'warn'}`}>
            <div className="psi-list-card-title">Security</div>
            <div className="psi-list-card-copy">
              HTTPS: {isHttps ? 'Enabled' : 'Not enabled'}
            </div>
            <div className="psi-list-card-copy">
              Server signature: {parsedEvidence.serverFindings.some(f => f.signatureExposed) ? 'Exposed' : 'Hidden'}
            </div>
          </div>
        </div>
      </div>

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - web_basic_surface`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function IpGeolocationEvidence({
  evidence,
  onViewRawEvidence,
  subdomain,
}: {
  evidence: unknown;
  onViewRawEvidence: (content: unknown, title: string) => void;
  subdomain: string;
}) {
  const parsedEvidence = parseIpGeolocation(evidence);
  if (!parsedEvidence) {
    return null;
  }

  const rawLineCount = JSON.stringify(evidence, null, 2).split('\n').length;

  // Determine if all observations have the same location data
  const observations = parsedEvidence.observations;
  const allSameLocation = observations.length > 0 && observations.every(
    (obs, _, arr) =>
      obs.city === arr[0].city &&
      obs.region === arr[0].region &&
      obs.country === arr[0].country &&
      obs.timezone === arr[0].timezone &&
      obs.loc === arr[0].loc
  );

  return (
    <div className="psi-evidence">
      <div className="psi-overview-grid">
        <div className="psi-overview-card">
          <span className="psi-overview-label">IP Address</span>
          <span className="psi-overview-value">{parsedEvidence.ip ?? parsedEvidence.ips[0] ?? 'N/A'}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Hostname</span>
          <span className="psi-overview-value">{parsedEvidence.host ?? 'N/A'}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Country</span>
          <span className="psi-overview-value">
            {allSameLocation && observations[0].country ? observations[0].country : parsedEvidence.country ?? (observations.length > 0 ? 'Multi' : 'N/A')}
          </span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Region</span>
          <span className="psi-overview-value">
            {allSameLocation && observations[0].region ? observations[0].region : parsedEvidence.region ?? (observations.length > 0 ? 'Multi' : 'N/A')}
          </span>
        </div>
      </div>

      {parsedEvidence.ips.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Observed IPs</div>
          <div className="psi-list-grid">
            {parsedEvidence.ips.map((ip, index) => (
              <div key={`${ip}-${index}`} className="psi-list-card good">
                <div className="psi-list-card-title">IP {index + 1}</div>
                <div className="psi-list-card-copy">{ip}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.observations.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Observations</div>
          <div className="psi-list-grid">
            {parsedEvidence.observations.map((observation, index) => (
              <div key={`${observation.ip ?? index}`} className="psi-list-card good">
                <div className="psi-list-card-title">{observation.ip ?? `Observation ${index + 1}`}</div>
                <div className="psi-list-card-copy">
                  {[
                    observation.city,
                    observation.region,
                    observation.country,
                    observation.timezone,
                    observation.loc,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="psi-section-block">
        <div className="psi-section-heading">Location Details</div>
        <div className="psi-list-grid">
          <div className="psi-list-card good">
            <div className="psi-list-card-title">City</div>
            <div className="psi-list-card-copy">
              {allSameLocation && observations[0].city ? observations[0].city : parsedEvidence.city ?? (observations.length > 0 ? 'Multi' : 'Unknown')}
            </div>
          </div>
          <div className="psi-list-card good">
            <div className="psi-list-card-title">Postal Code</div>
            <div className="psi-list-card-copy">
              {allSameLocation && observations[0].postal ? observations[0].postal : parsedEvidence.postal ?? (observations.length > 0 ? 'Multi' : 'N/A')}
            </div>
          </div>
          <div className="psi-list-card good">
            <div className="psi-list-card-title">Timezone</div>
            <div className="psi-list-card-copy">
              {allSameLocation && observations[0].timezone ? observations[0].timezone : parsedEvidence.timezone ?? (observations.length > 0 ? 'Multi' : 'N/A')}
            </div>
          </div>
          <div className="psi-list-card good">
            <div className="psi-list-card-title">Coordinates</div>
            <div className="psi-list-card-copy">
              {allSameLocation && observations[0].loc ? observations[0].loc : parsedEvidence.loc ?? (observations.length > 0 ? 'Multi' : 'N/A')}
            </div>
          </div>
        </div>
      </div>

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - ip_geolocation`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function IpHostingProviderEvidence({
  evidence,
  onViewRawEvidence,
  subdomain,
}: {
  evidence: unknown;
  onViewRawEvidence: (content: unknown, title: string) => void;
  subdomain: string;
}) {
  const parsedEvidence = parseIpHostingProvider(evidence);
  if (!parsedEvidence) {
    return null;
  }

  const rawLineCount = JSON.stringify(evidence, null, 2).split('\n').length;
  const proxyTone = parsedEvidence.cloudflareProxy ? 'warn' : 'good';

  return (
    <div className="psi-evidence">
      <div className="psi-overview-grid">
        <div className="psi-overview-card">
          <span className="psi-overview-label">IP Address</span>
          <span className="psi-overview-value">{parsedEvidence.ip ?? parsedEvidence.ips[0] ?? 'N/A'}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Provider</span>
          <span className="psi-overview-value">{parsedEvidence.provider ?? 'Unknown'}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">ASN</span>
          <span className="psi-overview-value">{parsedEvidence.asn ?? 'N/A'}</span>
        </div>
        {parsedEvidence.commonCloudProvider && (
          <div className="psi-overview-card">
            <span className="psi-overview-label">Cloud Provider</span>
            <span className="psi-overview-value">{parsedEvidence.commonCloudProvider}</span>
          </div>
        )}
      </div>

      {parsedEvidence.ips.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Observed IPs</div>
          <div className="psi-list-grid">
            {parsedEvidence.ips.map((ip, index) => (
              <div key={`${ip}-${index}`} className="psi-list-card good">
                <div className="psi-list-card-title">IP {index + 1}</div>
                <div className="psi-list-card-copy">{ip}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.providers.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Providers</div>
          <div className="psi-list-grid">
            {parsedEvidence.providers.map((provider, index) => (
              <div key={`${provider}-${index}`} className="psi-list-card good">
                <div className="psi-list-card-title">Provider {index + 1}</div>
                <div className="psi-list-card-copy">{provider}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.observations.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Observations</div>
          <div className="psi-list-grid">
            {parsedEvidence.observations.map((observation, index) => (
              <div key={`${observation.ip ?? index}`} className="psi-list-card good">
                <div className="psi-list-card-title">{observation.ip ?? `Observation ${index + 1}`}</div>
                <div className="psi-list-card-copy">
                  {[
                    observation.provider,
                    observation.commonCloudProvider,
                    observation.organization,
                    observation.asn,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No provider details'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="psi-section-block">
        <div className="psi-section-heading">Provider Details</div>
        <div className="psi-list-grid">
          <div className="psi-list-card good">
            <div className="psi-list-card-title">Organization</div>
            <div className="psi-list-card-copy">{parsedEvidence.organization ?? 'N/A'}</div>
          </div>
          <div className={`psi-list-card ${proxyTone}`}>
            <div className="psi-list-card-title">Cloudflare Proxy</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.cloudflareProxy ? 'Enabled' : 'Not detected'}
            </div>
          </div>
          {parsedEvidence.host && (
            <div className="psi-list-card good">
              <div className="psi-list-card-title">Hostname</div>
              <div className="psi-list-card-copy">{parsedEvidence.host}</div>
            </div>
          )}
        </div>
      </div>

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - ip_hosting_provider`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function WebSecurityHeadersEvidence({
  evidence,
  onViewRawEvidence,
  subdomain,
}: {
  evidence: unknown;
  onViewRawEvidence: (content: unknown, title: string) => void;
  subdomain: string;
}) {
  const parsedEvidence = parseWebSecurityHeaders(evidence);
  if (!parsedEvidence) {
    return null;
  }

  const rawLineCount = JSON.stringify(evidence, null, 2).split('\n').length;

  const headerItems = [
    {
      key: 'HSTS',
      value: parsedEvidence.hstsPresent,
      description: 'HTTP Strict Transport Security',
    },
    {
      key: 'CSP',
      value: parsedEvidence.cspPresent,
      description: 'Content Security Policy',
    },
    {
      key: 'X-Frame-Options',
      value: parsedEvidence.xfoPresent,
      description: 'Clickjacking protection',
    },
    {
      key: 'X-Content-Type-Options',
      value: parsedEvidence.xctoPresent,
      description: 'MIME type sniffing protection',
    },
    {
      key: 'Referrer-Policy',
      value: parsedEvidence.refpolPresent,
      description: 'Referrer information control',
    },
    {
      key: 'CORP',
      value: parsedEvidence.corpPresent,
      description: 'Cross-Origin Resource Policy',
    },
    {
      key: 'COOP',
      value: parsedEvidence.coopPresent,
      description: 'Cross-Origin Opener Policy',
    },
    {
      key: 'COEP',
      value: parsedEvidence.coepPresent,
      description: 'Cross-Origin Embedder Policy',
    },
    {
      key: 'Permissions-Policy',
      value: parsedEvidence.permpolPresent,
      description: 'Browser feature permissions',
    },
  ];

  const presentHeaders = headerItems.filter((item) => item.value !== null);
  const missingHeaders = headerItems.filter((item) => item.value === null);

  return (
    <div className="psi-evidence">
      <div className="psi-overview-grid">
        <div className="psi-overview-card">
          <span className="psi-overview-label">Headers Present</span>
          <span className="psi-overview-value">{presentHeaders.length}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Headers Missing</span>
          <span className="psi-overview-value">{missingHeaders.length}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Coverage</span>
          <span className="psi-overview-value">
            {Math.round((presentHeaders.length / headerItems.length) * 100)}%
          </span>
        </div>
      </div>

      {presentHeaders.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Security Headers Present</div>
          <div className="psi-list-grid">
            {presentHeaders.map((item) => (
              <div className="psi-list-card good" key={item.key}>
                <div className="psi-list-card-title">{item.key}</div>
                <div className="psi-list-card-copy">{item.description}</div>
                {item.value && (
                  <div className="psi-list-card-copy" style={{ marginTop: '6px', fontSize: '11px' }}>
                    Value: {item.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {missingHeaders.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Security Headers Missing</div>
          <div className="psi-list-grid">
            {missingHeaders.map((item) => (
              <div className="psi-list-card bad" key={item.key}>
                <div className="psi-list-card-title">{item.key}</div>
                <div className="psi-list-card-copy">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - web_security_headers`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function IpReputationDnsblEvidence({
  evidence,
  onViewRawEvidence,
  subdomain,
}: {
  evidence: unknown;
  onViewRawEvidence: (content: unknown, title: string) => void;
  subdomain: string;
}) {
  const parsedEvidence = parseIpReputationDnsbl(evidence);
  if (!parsedEvidence) {
    return null;
  }

  const rawLineCount = JSON.stringify(evidence, null, 2).split('\n').length;
  const isListed = parsedEvidence.listed.length > 0;
  const tone = isListed ? 'bad' : 'good';

  return (
    <div className="psi-evidence">
      <div className="psi-overview-grid">
        <div className="psi-overview-card">
          <span className="psi-overview-label">IP Address</span>
          <span className="psi-overview-value">{parsedEvidence.ip ?? parsedEvidence.ips[0] ?? 'N/A'}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Hostname</span>
          <span className="psi-overview-value">{parsedEvidence.host ?? 'N/A'}</span>
        </div>
        {parsedEvidence.family && (
          <div className="psi-overview-card">
            <span className="psi-overview-label">IP Version</span>
            <span className="psi-overview-value">{parsedEvidence.family.toUpperCase()}</span>
          </div>
        )}
        <div className="psi-overview-card">
          <span className="psi-overview-label">Status</span>
          <span className={`psi-overview-value ${tone}`}>
            {isListed ? 'Listed' : 'Clean'}
          </span>
        </div>
      </div>

      {parsedEvidence.ips.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Observed IPs</div>
          <div className="psi-list-grid">
            {parsedEvidence.ips.map((ip, index) => (
              <div key={`${ip}-${index}`} className="psi-list-card good">
                <div className="psi-list-card-title">IP {index + 1}</div>
                <div className="psi-list-card-copy">{ip}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.observations.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Observations</div>
          <div className="psi-list-grid">
            {parsedEvidence.observations.map((observation, index) => {
              const isListedObservation = observation.listed.length > 0;
              return (
                <div
                  key={`${observation.ip ?? index}`}
                  className={`psi-list-card ${isListedObservation ? 'bad' : 'good'}`}
                >
                  <div className="psi-list-card-title">
                    {observation.ip ?? `Observation ${index + 1}`}
                  </div>
                  <div className="psi-list-card-copy">
                    {observation.family ? `Family: ${observation.family.toUpperCase()}` : 'Family: N/A'}
                  </div>
                  <div className="psi-list-card-copy">
                    Checked: {observation.checkedLists.length} lists
                  </div>
                  <div className="psi-list-card-copy">
                    {isListedObservation
                      ? `${observation.listed.length} listing${observation.listed.length === 1 ? '' : 's'} found`
                      : 'No listings found'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {parsedEvidence.checkedLists.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">DNSBL Lists Checked</div>
          <div className="psi-list-grid">
            {parsedEvidence.checkedLists.map((list) => {
              const isListedOnThisList = parsedEvidence.listed.some(
                (listing) => listing.list === list
              );
              return (
                <div
                  className={`psi-list-card ${isListedOnThisList ? 'bad' : 'good'}`}
                  key={list}
                >
                  <div className="psi-list-card-title">{list}</div>
                  <div className="psi-list-card-copy">
                    {isListedOnThisList ? 'Listed' : 'Not listed'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {parsedEvidence.listed.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Active Listings</div>
          <div className="psi-list-grid">
            {parsedEvidence.listed.map((listing, index) => (
              <div className="psi-list-card bad" key={`${listing.list}-${index}`}>
                <div className="psi-list-card-title">{listing.list ?? 'Unknown List'}</div>
                {listing.zone && (
                  <div className="psi-list-card-copy">Zone: {listing.zone}</div>
                )}
                {listing.answers.length > 0 && (
                  <div className="psi-list-card-copy">
                    Answers: {listing.answers.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.listed.length === 0 && parsedEvidence.checkedLists.length === 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Reputation Status</div>
          <div className="psi-list-grid">
            <div className="psi-list-card good">
              <div className="psi-list-card-title">IP Reputation</div>
              <div className="psi-list-card-copy">
                This IP address was checked but no listing data was available.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - ip_reputation_dnsbl`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function WebHstsEvidence({
  evidence,
  onViewRawEvidence,
  subdomain,
}: {
  evidence: unknown;
  onViewRawEvidence: (content: unknown, title: string) => void;
  subdomain: string;
}) {
  const parsedEvidence = parseWebHsts(evidence);
  if (!parsedEvidence) {
    return null;
  }

  const rawLineCount = JSON.stringify(evidence, null, 2).split('\n').length;

  const httpsStatusTone = parsedEvidence.httpsStatus === 200 ? 'good' : 'bad';
  const redirectTone = parsedEvidence.httpRedirectsToHttps ? 'good' : 'warn';
  const hstsHeaderTone = parsedEvidence.hstsHeader ? 'good' : 'bad';
  
  let certDaysTone: 'good' | 'warn' | 'bad' = 'good';
  if (parsedEvidence.certDaysLeft !== null) {
    if (parsedEvidence.certDaysLeft < 7) {
      certDaysTone = 'bad';
    } else if (parsedEvidence.certDaysLeft < 30) {
      certDaysTone = 'warn';
    }
  }

  return (
    <div className="psi-evidence">
      <div className="psi-overview-grid">
        <div className={`psi-overview-card`}>
          <span className="psi-overview-label">HTTPS Status</span>
          <span className={`psi-overview-value ${httpsStatusTone}`}>
            {parsedEvidence.httpsStatus ?? 'N/A'}
          </span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">HTTP → HTTPS</span>
          <span className="psi-overview-value">
            {parsedEvidence.httpRedirectsToHttps ? 'Yes' : 'No'}
          </span>
        </div>
        {parsedEvidence.certDaysLeft !== null && (
          <div className="psi-overview-card">
            <span className="psi-overview-label">Cert Days Left</span>
            <span className={`psi-overview-value ${certDaysTone}`}>
              {parsedEvidence.certDaysLeft}
            </span>
          </div>
        )}
        <div className="psi-overview-card">
          <span className="psi-overview-label">HSTS Header</span>
          <span className="psi-overview-value">
            {parsedEvidence.hstsHeader ? 'Present' : 'Missing'}
          </span>
        </div>
      </div>

      <div className="psi-section-block">
        <div className="psi-section-heading">Security Configuration</div>
        <div className="psi-list-grid">
          <div className={`psi-list-card ${httpsStatusTone}`}>
            <div className="psi-list-card-title">HTTPS Availability</div>
            <div className="psi-list-card-copy">
              Status code {parsedEvidence.httpsStatus ?? 'unknown'}
            </div>
            <div className="psi-list-card-copy" style={{ marginTop: '6px', fontSize: '11px' }}>
              {parsedEvidence.httpsStatus === 200
                ? 'HTTPS is working correctly'
                : 'HTTPS may have issues'}
            </div>
          </div>

          <div className={`psi-list-card ${redirectTone}`}>
            <div className="psi-list-card-title">HTTP Redirect</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.httpRedirectsToHttps
                ? 'HTTP redirects to HTTPS'
                : 'HTTP does not redirect'}
            </div>
          </div>

          <div className={`psi-list-card ${hstsHeaderTone}`}>
            <div className="psi-list-card-title">HSTS Header</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.hstsHeader
                ? 'Present'
                : 'Not set'}
            </div>
            {parsedEvidence.hstsHeader && (
              <div className="psi-list-card-copy" style={{ marginTop: '6px', fontSize: '11px' }}>
                {parsedEvidence.hstsHeader}
              </div>
            )}
          </div>

          {parsedEvidence.certDaysLeft !== null && (
            <div className={`psi-list-card ${certDaysTone}`}>
              <div className="psi-list-card-title">Certificate Expiration</div>
              <div className="psi-list-card-copy">
                {parsedEvidence.certDaysLeft} days remaining
              </div>
              {parsedEvidence.certDaysLeft < 30 && (
                <div className="psi-list-card-copy" style={{ marginTop: '6px', fontSize: '11px' }}>
                  {parsedEvidence.certDaysLeft < 7
                    ? 'Certificate expiring soon!'
                    : 'Renew certificate soon'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - web_hsts`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function WebMixedContentEvidence({
  evidence,
  onViewRawEvidence,
  subdomain,
}: {
  evidence: unknown;
  onViewRawEvidence: (content: unknown, title: string) => void;
  subdomain: string;
}) {
  const parsedEvidence = parseWebMixedContent(evidence);
  if (!parsedEvidence) {
    return null;
  }

  const rawLineCount = JSON.stringify(evidence, null, 2).split('\n').length;
  const hasMixedContent = (parsedEvidence.httpReferenceCount ?? 0) > 0;
  const tone = hasMixedContent ? 'bad' : 'good';

  return (
    <div className="psi-evidence">
      <div className="psi-overview-grid">
        <div className="psi-overview-card">
          <span className="psi-overview-label">HTTP References</span>
          <span className={`psi-overview-value ${tone}`}>
            {parsedEvidence.httpReferenceCount ?? 0}
          </span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Status</span>
          <span className="psi-overview-value">
            {hasMixedContent ? 'Mixed Content' : 'Clean'}
          </span>
        </div>
        {parsedEvidence.hosts.length > 0 && (
          <div className="psi-overview-card">
            <span className="psi-overview-label">External Hosts</span>
            <span className="psi-overview-value">{parsedEvidence.hosts.length}</span>
          </div>
        )}
      </div>

      {hasMixedContent && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Mixed Content Details</div>
          <div className="psi-list-grid">
            <div className="psi-list-card bad">
              <div className="psi-list-card-title">HTTP References Found</div>
              <div className="psi-list-card-copy">
                {parsedEvidence.httpReferenceCount} HTTP resource{parsedEvidence.httpReferenceCount !== 1 ? 's' : ''} detected on HTTPS page
              </div>
              <div className="psi-list-card-copy" style={{ marginTop: '6px', fontSize: '11px' }}>
                Load HTTPS versions of external resources to avoid mixed content warnings
              </div>
            </div>
          </div>
        </div>
      )}

      {parsedEvidence.hosts.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">
            External Host{parsedEvidence.hosts.length !== 1 ? 's' : ''}
          </div>
          <div className="psi-list-grid">
            {parsedEvidence.hosts.map((host) => (
              <div className={`psi-list-card ${hasMixedContent ? 'bad' : 'good'}`} key={host}>
                <div className="psi-list-card-title">{host}</div>
                <div className="psi-list-card-copy">
                  {hasMixedContent ? 'Has HTTP references' : 'No issues detected'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasMixedContent && parsedEvidence.hosts.length === 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Content Status</div>
          <div className="psi-list-grid">
            <div className="psi-list-card good">
              <div className="psi-list-card-title">No Mixed Content</div>
              <div className="psi-list-card-copy">
                All resources are served securely over HTTPS
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - web_mixed_content`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function WebSeoBasicsEvidence({
  evidence,
  onViewRawEvidence,
  subdomain,
}: {
  evidence: unknown;
  onViewRawEvidence: (content: unknown, title: string) => void;
  subdomain: string;
}) {
  const parsedEvidence = parseWebSeoBasics(evidence);
  if (!parsedEvidence) {
    return null;
  }

  const rawLineCount = JSON.stringify(evidence, null, 2).split('\n').length;
  const totalIssues = parsedEvidence.warnIssues.length + parsedEvidence.infoIssues.length;

  return (
    <div className="psi-evidence">
      <div className="psi-overview-grid">
        <div className="psi-overview-card">
          <span className="psi-overview-label">Status Code</span>
          <span className="psi-overview-value">{parsedEvidence.statusCode ?? 'N/A'}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Title Length</span>
          <span className="psi-overview-value">{parsedEvidence.titleLength ?? 0}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Meta Description</span>
          <span className="psi-overview-value">{parsedEvidence.metaDescriptionLength ?? 0}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">SEO Issues</span>
          <span className={`psi-overview-value ${totalIssues > 0 ? 'bad' : 'good'}`}>
            {totalIssues}
          </span>
        </div>
      </div>

      <div className="psi-section-block">
        <div className="psi-section-heading">SEO Elements</div>
        <div className="psi-list-grid">
          <div className={`psi-list-card ${parsedEvidence.hasCanonical ? 'good' : 'bad'}`}>
            <div className="psi-list-card-title">Canonical URL</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.hasCanonical ? 'Present' : 'Missing'}
            </div>
          </div>
          <div className={`psi-list-card ${parsedEvidence.ogTagsPresent ? 'good' : 'warn'}`}>
            <div className="psi-list-card-title">Open Graph Tags</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.ogTagsPresent ? 'Present' : 'Missing'}
            </div>
          </div>
          <div className={`psi-list-card ${parsedEvidence.twitterCardPresent ? 'good' : 'warn'}`}>
            <div className="psi-list-card-title">Twitter Card</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.twitterCardPresent ? 'Present' : 'Missing'}
            </div>
          </div>
          <div className={`psi-list-card ${parsedEvidence.hreflangPresent ? 'good' : 'warn'}`}>
            <div className="psi-list-card-title">Hreflang Tags</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.hreflangPresent ? 'Present' : 'Not set'}
            </div>
          </div>
        </div>
      </div>

      <div className="psi-section-block">
        <div className="psi-section-heading">Configuration</div>
        <div className="psi-list-grid">
          <div className={`psi-list-card ${parsedEvidence.robotsTxtOk ? 'good' : 'bad'}`}>
            <div className="psi-list-card-title">Robots.txt</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.robotsTxtOk ? 'Configured' : 'Missing or invalid'}
            </div>
          </div>
          <div className={`psi-list-card ${parsedEvidence.sitemapOk ? 'good' : 'bad'}`}>
            <div className="psi-list-card-title">Sitemap</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.sitemapOk ? 'Configured' : 'Missing or invalid'}
            </div>
          </div>
          <div className={`psi-list-card ${parsedEvidence.readmePresent ? 'good' : 'warn'}`}>
            <div className="psi-list-card-title">README</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.readmePresent ? 'Present' : 'Not found'}
            </div>
          </div>
          <div className={`psi-list-card ${parsedEvidence.licensePresent ? 'good' : 'warn'}`}>
            <div className="psi-list-card-title">License</div>
            <div className="psi-list-card-copy">
              {parsedEvidence.licensePresent ? 'Present' : 'Not found'}
            </div>
          </div>
        </div>
      </div>

      {parsedEvidence.warnIssues.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Warnings</div>
          <div className="psi-list-grid">
            {parsedEvidence.warnIssues.map((issue) => (
              <div className="psi-list-card warn" key={issue}>
                <div className="psi-list-card-title">{issue.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.infoIssues.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Informational</div>
          <div className="psi-list-grid">
            {parsedEvidence.infoIssues.map((issue) => (
              <div className="psi-list-card" key={issue}>
                <div className="psi-list-card-title">{issue.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - web_seo_basics`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

function DnsCnameChainEvidence({
  evidence,
  onViewRawEvidence,
  subdomain,
}: {
  evidence: unknown;
  onViewRawEvidence: (content: unknown, title: string) => void;
  subdomain: string;
}) {
  const parsedEvidence = parseDnsCnameChain(evidence);
  if (!parsedEvidence) {
    return null;
  }

  const rawLineCount = JSON.stringify(evidence, null, 2).split('\n').length;

  return (
    <div className="psi-evidence">
      <div className="psi-overview-grid">
        <div className="psi-overview-card">
          <span className="psi-overview-label">Chain Depth</span>
          <span className="psi-overview-value">{parsedEvidence.depth ?? 0}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Terminal Domain</span>
          <span className="psi-overview-value">{parsedEvidence.terminal ?? 'N/A'}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">Resolved Addresses</span>
          <span className="psi-overview-value">{parsedEvidence.addresses.length}</span>
        </div>
        <div className="psi-overview-card">
          <span className="psi-overview-label">CNAME Links</span>
          <span className="psi-overview-value">{parsedEvidence.chain.length}</span>
        </div>
      </div>

      {parsedEvidence.chain.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">CNAME Chain</div>
          <div className="psi-list-grid">
            {parsedEvidence.chain.map((link, index) => (
              <div className="psi-list-card good" key={`${link.from}-${index}`}>
                <div className="psi-list-card-title">Step {index + 1}</div>
                <div className="psi-list-card-copy">From: {link.from ?? 'Unknown'}</div>
                <div className="psi-list-card-copy">To: {link.to ?? 'Unknown'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.addresses.length > 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">Resolved IP Addresses</div>
          <div className="psi-list-grid">
            {parsedEvidence.addresses.map((address) => (
              <div className="psi-list-card good" key={address}>
                <div className="psi-list-card-title">IP Address</div>
                <div className="psi-list-card-copy">{address}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEvidence.chain.length === 0 && parsedEvidence.addresses.length === 0 && (
        <div className="psi-section-block">
          <div className="psi-section-heading">DNS Resolution</div>
          <div className="psi-list-grid">
            <div className="psi-list-card good">
              <div className="psi-list-card-title">Terminal Domain</div>
              <div className="psi-list-card-copy">
                {parsedEvidence.terminal ?? 'No CNAME chain data available'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="psi-raw-link">
        {renderRawEvidenceButton(evidence, `${subdomain} - dns_cname_chain`, onViewRawEvidence, rawLineCount)}
      </div>
    </div>
  );
}

export function ResultEvidence({ result, subdomain, onViewRawEvidence }: ResultEvidenceProps) {
  if (!result.evidence) {
    return null;
  }

  if (result.test_id === 'psi_web_performance') {
    return (
      <div className="result-evidence">
        <div className="evidence-label">Performance analysis</div>
        <PsiPerformanceEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (parseEmailProbeEvidence(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">Mail probe summary</div>
        <EmailProbeEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (result.test_id === 'web_basic_surface' && parseWebBasicSurface(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">Web surface analysis</div>
        <WebBasicSurfaceEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (result.test_id === 'ip_geolocation' && parseIpGeolocation(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">IP geolocation</div>
        <IpGeolocationEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (result.test_id === 'ip_hosting_provider' && parseIpHostingProvider(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">Hosting provider</div>
        <IpHostingProviderEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (result.test_id === 'web_security_headers' && parseWebSecurityHeaders(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">Security headers</div>
        <WebSecurityHeadersEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (result.test_id === 'ip_reputation_dnsbl' && parseIpReputationDnsbl(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">IP reputation (DNSBL)</div>
        <IpReputationDnsblEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (result.test_id === 'web_hsts' && parseWebHsts(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">HSTS configuration</div>
        <WebHstsEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (result.test_id === 'web_mixed_content' && parseWebMixedContent(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">Mixed content</div>
        <WebMixedContentEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (result.test_id === 'web_seo_basics' && parseWebSeoBasics(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">SEO basics</div>
        <WebSeoBasicsEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  if (result.test_id === 'dns_cname_chain' && parseDnsCnameChain(result.evidence)) {
    return (
      <div className="result-evidence">
        <div className="evidence-label">DNS CNAME chain</div>
        <DnsCnameChainEvidence
          evidence={result.evidence}
          onViewRawEvidence={onViewRawEvidence}
          subdomain={subdomain}
        />
      </div>
    );
  }

  const rawEvidence = JSON.stringify(result.evidence, null, 2);
  const lineCount = rawEvidence.split('\n').length;

  return (
    <div className="result-evidence">
      <div className="evidence-label">Evidence:</div>
      {lineCount > 50 ? (
        renderRawEvidenceButton(result.evidence, `${subdomain} - ${result.test_id}`, onViewRawEvidence, lineCount)
      ) : (
        <pre className="evidence-content">{rawEvidence}</pre>
      )}
    </div>
  );
}

export default ResultEvidence;
