import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { ThemeMode } from '../../types/studio';

const THEMES: ThemeMode[] = ['DARK', 'BLUE', 'RED', 'CYAN'];

export const TopHeader: React.FC<{ onQuickExport: () => void }> = ({ onQuickExport }) => {
  const { activeNav, setActiveNav, theme, setTheme } = useStudio();

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#dashboard"
        onClick={(e) => {
          e.preventDefault();
          setActiveNav('dashboard');
        }}
        className="text-base font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap"
      >
        SS SMART STUDIO
      </a>

      {/* Zone 2: 4 primary workflow navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
        <button
          onClick={() => setActiveNav('image-to-prompt')}
          className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap ${
            activeNav === 'image-to-prompt' ? 'text-[var(--text-primary)] underline underline-offset-4' : ''
          }`}
        >
          Image → Prompt
        </button>
        <button
          onClick={() => setActiveNav('vector-converter')}
          className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap ${
            activeNav === 'vector-converter' ? 'text-[var(--text-primary)] underline underline-offset-4' : ''
          }`}
        >
          Vector Converter
        </button>
        <button
          onClick={() => setActiveNav('icon-sheet')}
          className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap ${
            activeNav === 'icon-sheet' ? 'text-[var(--text-primary)] underline underline-offset-4' : ''
          }`}
        >
          Icon Sheet
        </button>
        <button
          onClick={() => setActiveNav('flow-automation')}
          className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap ${
            activeNav === 'flow-automation' ? 'text-[var(--text-primary)] underline underline-offset-4' : ''
          }`}
        >
          Flow
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions (4-Theme Selector + Quick Export) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                theme === t
                  ? 'bg-[var(--accent-primary)] text-slate-950 font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={onQuickExport}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Export ZIP
        </button>
      </div>
    </header>
  );
};
