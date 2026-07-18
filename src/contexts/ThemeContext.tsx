import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material';
import { lightTheme, darkTheme } from '../theme/theme';
import { useSettingsStore } from '../store/useSettingsStore';

interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const { viewScale } = useSettingsStore();

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode') as 'light' | 'dark';
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  const toggleTheme = () => {
    setMode((prev) => {
      const newMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  const theme = useMemo(() => (mode === 'light' ? lightTheme : darkTheme), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            html: {
              // Only scale when intentionally changed; keep 100% for sharp rem text
              ...(viewScale !== 100
                ? { fontSize: `${Math.round(viewScale)}%` }
                : { fontSize: '100%' }),
              WebkitFontSmoothing: 'auto',
              MozOsxFontSmoothing: 'auto',
              textRendering: 'geometricPrecision',
            },
            body: {
              fontFamily: '"Poppins", system-ui, sans-serif',
              WebkitFontSmoothing: 'auto',
              MozOsxFontSmoothing: 'auto',
            },
          }}
        />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
