import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import Footer from '../components/Footer';
import { getAuditLimitEnabled, getAuditLimitMax } from '../lib/auditLimit';
import { setPageSeo, SITE_URL } from '../lib/seo';
import '../styles/tokens.css';
import '../App.css';

const AUDIT_LIMIT_ENABLED = getAuditLimitEnabled();
const AUDIT_LIMIT_MAX = getAuditLimitMax();

const PROJECT_FAQS = [
  {
    question: 'What does this website audit tool check?',
    answer:
      'It checks website performance, Core Web Vitals-style signals, technical SEO basics, HTTPS and HSTS behavior, security headers, DNS paths, SSL certificates, email authentication records, and exposed subdomains.',
  },
  {
    question: 'How is this different from Google PageSpeed Insights?',
    answer:
      'PageSpeed Insights focuses mainly on page performance. This tool keeps performance in view, but adds technical SEO, DNS, SSL, email, and subdomain discovery checks so you can review speed and infrastructure issues in one place.',
  },
  {
    question: 'Is this a technical SEO audit tool?',
    answer:
      'Yes, for implementation-focused SEO checks. It helps surface issues around metadata, canonicals, mixed content, HTTPS, and other technical signals that can affect search visibility and trust. It is not a substitute for content strategy or keyword research.',
  },
  {
    question: 'Who is this audit best for?',
    answer:
      'It is useful for developers, agencies, marketers, and site owners who want a fast outside-in review before launch, after infrastructure changes, during migrations, or as part of ongoing website health checks.',
  },
  {
    question: 'Does subdomain discovery work equally well on every domain?',
    answer:
      'It tends to be most reliable on smaller, simpler domains. In larger environments with many subdomains, discovery can be partial, so treat the results as useful guidance rather than a complete inventory.',
  },
] as const;

export function AboutPage() {
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    setPageSeo({
      title: 'About Artisan DAP | Website Audit Project',
      description:
        'Learn what Artisan DAP checks, how discovery behaves on larger domains, the current anonymous audit cap, and the roadmap for accounts and advanced domain tooling.',
      path: '/about',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'AboutPage',
            name: 'About Artisan DAP',
            url: `${SITE_URL}/about`,
            description:
              'Background, scope, limits, and roadmap for the Artisan DAP website audit project.',
          },
          {
            '@type': 'FAQPage',
            mainEntity: PROJECT_FAQS.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          },
        ],
      },
    });
  }, []);

  return (
    <div className="app">
      <TopBar>
        <ThemeToggle />
      </TopBar>

      <main className="wrap">
        <section className="hero about-hero">
          <div className="hero-content">
            <h1>About this project</h1>
            <p>
              Artisan DAP is a website performance and technical audit project
              built to combine PSI-style page insight with infrastructure,
              discovery, and implementation checks in one place.
            </p>
            <p>
              The goal is to give site owners, developers, and agencies a fast
              outside-in view of what may be affecting speed, trust, visibility,
              and domain hygiene.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/">
                Run an Audit
              </Link>
            </div>
          </div>
        </section>

        <section className="marketing-section" aria-labelledby="about-coverage-heading">
          <div className="marketing-copy">
            <h2 id="about-coverage-heading">What this website audit covers</h2>
            <p>
              This tool is meant for teams who want more than a single page speed
              score. It combines website performance audit signals and technical
              SEO checks with domain, security, and discovery data so you can
              review what affects experience and visibility in one place.
            </p>
          </div>
          <div className="marketing-grid">
            <article className="marketing-card">
              <h3>Performance and page experience</h3>
              <p>
                Review page speed, rendering behavior, and Core Web Vitals-style
                signals that can shape perceived performance and usability.
              </p>
            </article>
            <article className="marketing-card">
              <h3>Technical SEO and search visibility</h3>
              <p>
                Check titles, descriptions, canonicals, mixed content, and
                related implementation details that can influence crawlability and trust.
              </p>
            </article>
            <article className="marketing-card">
              <h3>DNS, SSL, and domain exposure</h3>
              <p>
                Inspect subdomains, CNAME chains, certificates, email
                authentication, and other public-facing infrastructure issues that are easy to miss.
              </p>
            </article>
          </div>
        </section>

        <section className="marketing-section" aria-labelledby="about-roadmap-heading">
          <div className="marketing-copy">
            <h2 id="about-roadmap-heading">Usage Limits and Roadmap</h2>
            <p>
              The current release is intentionally simple while we learn how
              people use it. That includes an anonymous audit cap today and a broader
              account system planned next.
            </p>
          </div>
          <div className="marketing-grid">
            <article className="marketing-card">
              <h3>Anonymous usage cap</h3>
              <p>
                {AUDIT_LIMIT_ENABLED
                  ? `Anonymous usage is currently capped at ${AUDIT_LIMIT_MAX} audit${AUDIT_LIMIT_MAX === 1 ? '' : 's'}. That helps keep the service open while we gauge demand and protect shared resources.`
                  : 'Anonymous usage is currently open while we gauge demand and shape the account model.'}
              </p>
            </article>
            <article className="marketing-card">
              <h3>Accounts are coming</h3>
              <p>
                Login and account support are on the roadmap. The goal is to make
                it easier to manage usage, preserve history, and unlock more
                advanced workflows over time.
              </p>
            </article>
            <article className="marketing-card">
              <h3>Planned advanced tooling</h3>
              <p>
                If the site sees strong adoption, the roadmap includes
                subscriptions, more audit tools, and the ability to upload a
                BIND DNS dump to fuzz full domains more reliably in larger, more
                complex environments.
              </p>
            </article>
          </div>
        </section>

        <section className="marketing-section" aria-labelledby="about-faq-heading">
          <div className="marketing-copy">
            <h2 id="about-faq-heading">FAQ</h2>
          </div>
          <div className="faq-list">
            {PROJECT_FAQS.map((item) => (
              <article className="faq-item" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AboutPage;
