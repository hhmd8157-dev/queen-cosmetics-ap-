export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'queen_theme_mode';

/**
 * Get current active theme from localStorage or system preference
 */
export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    console.error('Error reading theme from localStorage', e);
  }
  return 'light';
}

/**
 * Apply theme to the document HTML element and store in localStorage
 */
export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent('queen_theme_changed', { detail: { theme } }));
  } catch (e) {
    console.error('Error saving theme to localStorage', e);
  }
}

/**
 * Toggle between light and dark theme
 */
export function toggleThemeMode(currentTheme: ThemeMode): ThemeMode {
  const nextTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  return nextTheme;
}
