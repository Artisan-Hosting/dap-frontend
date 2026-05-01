import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { trackEvent } from '../lib/analytics';
import { getAuditLimitEnabled, getAuditLimitMax } from '../lib/auditLimit';
import artisanLockupDark from '../assets/branding/artisan-studios__lockup__dark__2048w.webp';
import artisanLockupLight from '../assets/branding/artisan-studios__lockup__light__2048w.webp';

interface TopBarProps {
  children?: React.ReactNode;
  onOpenSettings?: () => void;
}

const LIGHT_THEME_ICON_URL = '/branding/artisan-studios__mark__dark__1024.webp';
const DARK_THEME_ICON_URL = '/branding/artisan-studios__mark__light__1024.webp';
const MOBILE_NAV_MEDIA_QUERY = '(max-width: 1100px)';
const AUDIT_LIMIT_ENABLED = getAuditLimitEnabled();
const AUDIT_LIMIT_MAX = getAuditLimitMax();

export function TopBar({ children, onOpenSettings }: TopBarProps) {
  const { theme } = useTheme();
  const location = useLocation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const desktopLogo = theme === 'dark' ? artisanLockupLight : artisanLockupDark;
  const mobileIcon = theme === 'dark' ? DARK_THEME_ICON_URL : LIGHT_THEME_ICON_URL;

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_NAV_MEDIA_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (!event.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    handleViewportChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      const listener = (event: MediaQueryListEvent) => handleViewportChange(event);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    const legacyListener = (event: MediaQueryListEvent) => handleViewportChange(event);
    mediaQuery.addListener(legacyListener);
    return () => mediaQuery.removeListener(legacyListener);
  }, []);

  React.useEffect(() => {
    const faviconLink = document.querySelector<HTMLLinkElement>('link#theme-favicon');
    if (faviconLink) {
      faviconLink.href = mobileIcon;
      faviconLink.type = 'image/webp';
    }
  }, [mobileIcon]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="logo-icon">
             <img
               className="logo-image logo-image-desktop"
               src={desktopLogo}
               alt="Artisan DAP"
             />
             <img
               className="logo-image logo-image-mobile"
               src={mobileIcon}
               alt="Artisan DAP"
             />
          </div>
        </Link>

        <button
          className={`btn-icon menu-toggle ${isMobileMenuOpen ? 'is-open' : ''}`}
          onClick={() => {
            const nextOpenState = !isMobileMenuOpen;
            trackEvent('Mobile Menu Toggled', {
              is_open: nextOpenState,
            });
            setIsMobileMenuOpen(nextOpenState);
          }}
          aria-expanded={isMobileMenuOpen}
          aria-controls="primary-menu"
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          type="button"
        >
          <span className="menu-toggle-bar" />
          <span className="menu-toggle-bar" />
          <span className="menu-toggle-bar" />
        </button>

        <div id="primary-menu" className={`topbar-menu ${isMobileMenuOpen ? 'is-open' : ''}`}>
          <nav className="nav grow" aria-label="Primary">
            <Link
              to="/"
              className={location.pathname === '/' ? 'active-link' : ''}
              onClick={() => {
                trackEvent('Navigation Clicked', {
                  destination: 'audit',
                });
                setIsMobileMenuOpen(false);
              }}
            >
              Audit
            </Link>
            <Link
              to="/about"
              className={location.pathname === '/about' ? 'active-link' : ''}
              onClick={() => {
                trackEvent('Navigation Clicked', {
                  destination: 'about',
                });
                setIsMobileMenuOpen(false);
              }}
            >
              About
            </Link>
            <Link
              to="/history"
              className={location.pathname === '/history' ? 'active-link' : ''}
              onClick={() => {
                trackEvent('Navigation Clicked', {
                  destination: 'history',
                });
                setIsMobileMenuOpen(false);
              }}
            >
              History
            </Link>
          </nav>

          <div className="actions">
            {onOpenSettings && (
              <button
                className="btn-icon settings-btn"
                onClick={() => {
                  trackEvent('Settings Opened', {
                    source: 'topbar',
                  });
                  setIsMobileMenuOpen(false);
                  onOpenSettings();
                }}
                title="Open test settings"
                type="button"
              >
                <svg
                  className="settings-btn-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M10.325 4.317C10.751 2.561 13.249 2.561 13.675 4.317C13.95 5.45 15.233 5.986 16.248 5.368C17.823 4.409 19.591 6.177 18.632 7.752C18.014 8.767 18.55 10.05 19.683 10.325C21.439 10.751 21.439 13.249 19.683 13.675C18.55 13.95 18.014 15.233 18.632 16.248C19.591 17.823 17.823 19.591 16.248 18.632C15.233 18.014 13.95 18.55 13.675 19.683C13.249 21.439 10.751 21.439 10.325 19.683C10.05 18.55 8.767 18.014 7.752 18.632C6.177 19.591 4.409 17.823 5.368 16.248C5.986 15.233 5.45 13.95 4.317 13.675C2.561 13.249 2.561 10.751 4.317 10.325C5.45 10.05 5.986 8.767 5.368 7.752C4.409 6.177 6.177 4.409 7.752 5.368C8.767 5.986 10.05 5.45 10.325 4.317Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 12C15 13.657 13.657 15 12 15C10.343 15 9 13.657 9 12C9 10.343 10.343 9 12 9C13.657 9 15 10.343 15 12Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="settings-btn-label">Settings</span>
              </button>
            )}
            <button
              className="btn btn-ghost topbar-login"
              onClick={() => {
                trackEvent('Login Clicked');
                setIsMobileMenuOpen(false);
                setIsLoginModalOpen(true);
              }}
              type="button"
            >
              Login
            </button>
            {children}
          </div>
        </div>
      </div>

      {isLoginModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            trackEvent('Login Modal Closed', {
              action: 'overlay',
            });
            setIsLoginModalOpen(false);
          }}
        >
          <div className="modal-content contact-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Login coming soon</h3>
              <button
                className="modal-close"
                onClick={() => {
                  trackEvent('Login Modal Closed', {
                    action: 'close_button',
                  });
                  setIsLoginModalOpen(false);
                }}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="contact-success">
              <p>
                We&apos;re still building accounts and login. For now, you can use
                the tool without an account{AUDIT_LIMIT_ENABLED
                  ? `, up to the current anonymous limit of ${AUDIT_LIMIT_MAX} audits.`
                  : '.'}
              </p>
              <p>
                If usage grows, accounts will make room for subscriptions,
                saved workflows, and more advanced tooling.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  trackEvent('Login Modal Closed', {
                    action: 'primary_button',
                  });
                  setIsLoginModalOpen(false);
                }}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default TopBar;
