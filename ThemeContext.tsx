import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'visitwight-theme';

const resolveInitialTheme = (): Theme => {
    if (typeof window === 'undefined') {
        return 'light';
    }

    try {
        const storedTheme = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (storedTheme === 'light' || storedTheme === 'dark') {
            return storedTheme;
        }
    } catch {
        // Ignore storage access issues and fall back to detection.
    }

    const htmlElement = document.documentElement;
    if (
        htmlElement.classList.contains('dark') ||
        (htmlElement.getAttribute('data-theme') || '').toLowerCase() === 'dark'
    ) {
        return 'dark';
    }

    if (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
        return 'dark';
    }

    return 'light';
};

const applyThemeToDocument = (theme: Theme) => {
    if (typeof document === 'undefined') {
        return;
    }

    const htmlElement = document.documentElement;
    htmlElement.classList.toggle('dark', theme === 'dark');
    htmlElement.setAttribute('data-theme', theme);
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());

    useEffect(() => {
        applyThemeToDocument(theme);

        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // Ignore storage write errors.
        }
    }, [theme]);

    const setTheme = (nextTheme: Theme) => {
        setThemeState(nextTheme);
    };

    const toggleTheme = () => {
        setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
    };

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            setTheme,
            toggleTheme,
        }),
        [theme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
};
