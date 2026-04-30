import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { trackEvent } from '../lib/analytics';
import artisanLockupDark from '../assets/branding/artisan-studios__lockup__dark__2048w.webp';
import artisanLockupLight from '../assets/branding/artisan-studios__lockup__light__2048w.webp';

interface TopBarProps {
  children?: React.ReactNode;
  onOpenSettings?: () => void;
}

const LIGHT_THEME_ICON_URL = '/branding/artisan-studios__mark__dark__1024.webp';
const DARK_THEME_ICON_URL = '/branding/artisan-studios__mark__light__1024.webp';
const MOBILE_NAV_MEDIA_QUERY = '(max-width: 1100px)';

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
    const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
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
              alt="Artisan Hosting"
            />
            <img
              className="logo-image logo-image-mobile"
              src={mobileIcon}
              alt="Artisan Hosting"
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
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M16.5 10C16.5 10.7 16.8 11.4 17.3 11.9L17.9 12.5C18.5 13.1 18.5 14.1 17.9 14.7L16.7 15.9C16.1 16.5 15.1 16.5 14.5 15.9L13.9 15.3C13.4 14.8 12.7 14.5 12 14.5C11.3 14.5 10.6 14.8 10.1 15.3L9.5 15.9C8.9 16.5 7.9 16.5 7.3 15.9L6.1 14.7C5.5 14.1 5.5 13.1 6.1 12.5L6.7 11.9C7.2 11.4 7.5 10.7 7.5 10C7.5 9.3 7.2 8.6 6.7 8.1L6.1 7.5C5.5 6.9 5.5 5.9 6.1 5.3L7.3 4.1C7.9 3.5 8.9 3.5 9.5 4.1L10.1 4.7C10.6 5.2 11.3 5.5 12 5.5C12.7 5.5 13.4 5.2 13.9 4.7L14.5 4.1C15.1 3.5 16.1 3.5 16.7 4.1L17.9 5.3C18.5 5.9 18.5 6.9 17.9 7.5L17.3 8.1C16.8 8.6 16.5 9.3 16.5 10Z" stroke="currentColor" strokeWidth="1.5"/>
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
                We're still building the login experience. For now, everything on this site remains available without an account.
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
