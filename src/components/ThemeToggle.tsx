'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-12 h-6 rounded-full bg-muted/40" />;
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Перемикач теми (Світла / Темна)"
      title={isDark ? 'Перемкнути на світлу тему' : 'Перемкнути на темну тему'}
      onClick={toggleTheme}
      className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none ${
        isDark 
          ? 'bg-neutral-800 border border-neutral-700' 
          : 'bg-amber-100/80 border border-amber-300/60'
      }`}
    >
      {/* Background Icons */}
      <span className="absolute left-1.5 flex items-center justify-center text-amber-500/70">
        <Sun className="h-3 w-3" />
      </span>
      <span className="absolute right-1.5 flex items-center justify-center text-neutral-400">
        <Moon className="h-3 w-3" />
      </span>

      {/* Moving Thumb */}
      <span
        className={`pointer-events-none z-10 flex h-5 w-5 items-center justify-center rounded-full bg-card shadow-sm transition-transform duration-300 ease-in-out border border-border/50 ${
          isDark ? 'translate-x-6 text-sky-400' : 'translate-x-0 text-amber-500'
        }`}
      >
        {isDark ? (
          <Moon className="h-2.5 w-2.5 fill-sky-400 text-sky-400" />
        ) : (
          <Sun className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
        )}
      </span>
    </button>
  );
}
