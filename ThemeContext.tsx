import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode, UserTheme } from './types';

interface ThemeContextType {
  theme: UserTheme;
  setTheme: (theme: UserTheme) => void;
}

const DEFAULT_THEME: UserTheme = {
  mode: ThemeMode.SYSTEM,
  primaryColor: '#5d58ff'
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setInternalTheme] = useState<UserTheme>(() => {
    const saved = localStorage.getItem('gapt_theme_pref');
    return saved ? JSON.parse(saved) : DEFAULT_THEME;
  });

  const applyTheme = (t: UserTheme) => {
    const root = window.document.documentElement;
    const isDark = 
      t.mode === ThemeMode.DARK || 
      (t.mode === ThemeMode.SYSTEM && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
      t.mode === ThemeMode.CUSTOM; // Custom defaults to dark base for now as per app aesthetic

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply primary color
    if (t.primaryColor) {
      root.style.setProperty('--primary-accent', t.primaryColor);
    } else {
      root.style.setProperty('--primary-accent', '#5d58ff');
    }

    localStorage.setItem('gapt_theme_pref', JSON.stringify(t));
  };

  useEffect(() => {
    applyTheme(theme);
    
    // Listen for system theme changes if in system mode
    if (theme.mode === ThemeMode.SYSTEM) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme(theme);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setInternalTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
