import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

interface ThemeStoreState {
  preference: ThemePreference;
  toggleTheme: (currentTheme: Theme) => void;
  setPreference: (preference: ThemePreference) => void;
}

interface ThemeState {
  theme: Theme;
  preference: ThemePreference;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setPreference: (preference: ThemePreference) => void;
}

const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
}

const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set) => ({
      preference: 'system',
      toggleTheme: (currentTheme) => {
        const nextTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
        set({ preference: nextTheme });
      },
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'artisan-dap-theme',
      partialize: (state) => ({ preference: state.preference }),
    }
  )
);

export function useTheme(): ThemeState {
  const { preference, toggleTheme: toggleStoredTheme, setPreference } = useThemeStore();
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateSystemTheme);

      return () => {
        mediaQuery.removeEventListener('change', updateSystemTheme);
      };
    }

    mediaQuery.addListener(updateSystemTheme);

    return () => {
      mediaQuery.removeListener(updateSystemTheme);
    };
  }, []);

  const theme = preference === 'system' ? systemTheme : preference;

  return {
    theme,
    preference,
    toggleTheme: () => toggleStoredTheme(theme),
    setTheme: (nextTheme) => setPreference(nextTheme),
    setPreference,
  };
}
