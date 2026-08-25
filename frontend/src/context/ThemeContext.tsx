import { useState, useEffect, createContext, useMemo, useContext } from 'react';

/**
 * Auth/group context.
 *
 * Exposes the resolved session as a single source of truth for the app:
 *  - currentUser   — the logged-in user (or null)
 *  - currentGroup  — the active group (resolved from the session's
 *                    activeGroupId against the user's group list), or null
 *  - currentRole   — role in the active group
 *  - isAdmin       — convenience boolean
 *  - isLoading     — while the initial session check is in flight
 *
 * The backend re-validates that the session's active group is still one the
 * user belongs to on every /auth/me; if not, activeGroupId comes back null and
 * the route guard sends the user to onboarding.
 */

type ThemeVariants = 'dark'|'light'

const logos = {
  dark: '/default-monochrome-white.svg',
  light: '/default-monochrome.svg'
}

interface ThemeContextValue {
  theme: ThemeVariants;
  toggleTheme: ()=>void;
  logo: string
  accent: string
  setAccent: (a: string)=> void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light'|'dark'>(localStorage.getItem('theme') as ThemeVariants||'light')
  const [accent, setAccent] = useState(() => localStorage.getItem('accent') || 'theme-blue');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Handle light/dark mode
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
    
    // Handle accent color
    root.classList.remove('theme-blue', 'theme-green'); // Add any other themes here
    root.classList.add(accent);
    localStorage.setItem('accent', accent);
    
    console.log(localStorage.getItem('theme'))

  }, [theme, accent]);


  const value = useMemo<ThemeContextValue>(() => {

    const toggleTheme = () => {
      setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return {
      toggleTheme,
      theme,
      setAccent: (a)=>setAccent(a),
      accent,
      logo: logos[theme] 
    };
  }, [
      theme
  ]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};


export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within an ThemeProvider");
  }
  return ctx;
}
