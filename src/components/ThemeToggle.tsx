import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="btn btn-ghost"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span
        className="icon"
        style={{
          background: 'var(--warm)',
          boxShadow: '0 0 0 4px rgba(231,231,167,0.22)',
        }}
        aria-hidden="true"
      />
      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  );
}

export default ThemeToggle;