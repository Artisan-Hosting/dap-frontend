const SITE_NAME = 'Artisan DAP';
const SITE_URL = 'https://dap.artisanhosting.net';
const DEFAULT_IMAGE_URL = `${SITE_URL}/branding/artisan-studios__mark__dark__1024.webp`;
const STRUCTURED_DATA_ID = 'artisan-dap-structured-data';

interface PageSeoOptions {
  title: string;
  description: string;
  path: string;
  robots?: string;
  structuredData?: Record<string, unknown> | null;
}

function upsertMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function updateStructuredData(structuredData?: Record<string, unknown> | null) {
  const existing = document.getElementById(STRUCTURED_DATA_ID);

  if (!structuredData) {
    existing?.remove();
    return;
  }

  const script = existing ?? document.createElement('script');
  script.id = STRUCTURED_DATA_ID;
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(structuredData);

  if (!existing) {
    document.head.appendChild(script);
  }
}

function getAbsoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function setPageSeo({
  title,
  description,
  path,
  robots = 'index,follow',
  structuredData,
}: PageSeoOptions) {
  const url = getAbsoluteUrl(path);

  document.title = title;

  upsertMeta('meta[name="description"]', { name: 'description' }, description);
  upsertMeta('meta[name="robots"]', { name: 'robots' }, robots);
  upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
  upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title);
  upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
  upsertMeta('meta[property="og:url"]', { property: 'og:url' }, url);
  upsertMeta('meta[property="og:image"]', { property: 'og:image' }, DEFAULT_IMAGE_URL);
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, SITE_NAME);
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary');
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, DEFAULT_IMAGE_URL);
  upsertLink('canonical', url);
  updateStructuredData(structuredData);
}

export { SITE_NAME, SITE_URL };
