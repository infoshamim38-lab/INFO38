import React from 'react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Sparkles,
  Spline,
  Scissors,
  Grid,
  Workflow,
  Puzzle,
  Settings,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { NavSection } from '../../types/studio';

export const Sidebar: React.FC = () => {
  const { activeNav, setActiveNav } = useStudio();

  const renderItem = (id: NavSection, label: string, Icon: React.ElementType) => {
    const isActive = activeNav === id;
    return (
      <button
        key={id}
        onClick={() => setActiveNav(id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
          isActive
            ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    );
  };

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between select-none">
      <div className="p-4 space-y-5">
        <div className="px-2 pt-1 pb-2 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveNav('dashboard')}
            className="text-base font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap text-left"
          >
            SS SMART STUDIO
          </button>
        </div>

        <div className="space-y-1">
          {renderItem('dashboard', 'Dashboard', LayoutDashboard)}
        </div>

        <div className="space-y-1">
          <div className="px-3 pb-1 text-xs font-semibold text-[var(--text-muted)] tracking-wide">
            AI Tools
          </div>
          {renderItem('image-to-prompt', 'Image → Prompt', ImageIcon)}
          {renderItem('prompt-studio', 'Prompt Studio', Sparkles)}
        </div>

        <div className="space-y-1">
          <div className="px-3 pb-1 text-xs font-semibold text-[var(--text-muted)] tracking-wide">
            Vector
          </div>
          {renderItem('vector-converter', 'Vector Converter', Spline)}
          {renderItem('icon-extractor', 'Icon Extractor', Scissors)}
          {renderItem('icon-sheet', 'Icon Sheet', Grid)}
        </div>

        <div className="space-y-1">
          <div className="px-3 pb-1 text-xs font-semibold text-[var(--text-muted)] tracking-wide">
            Automation
          </div>
          {renderItem('flow-automation', 'Flow Automation', Workflow)}
        </div>

        <div className="space-y-1">
          <div className="px-3 pb-1 text-xs font-semibold text-[var(--text-muted)] tracking-wide">
            System
          </div>
          {renderItem('extension', 'Extension', Puzzle)}
          {renderItem('settings', 'Settings', Settings)}
        </div>
      </div>

      <div className="p-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-1">
        <div className="flex items-center justify-between">
          <span>Shortcuts</span>
          <span className="font-mono">Ctrl+O / S / E</span>
        </div>
      </div>
    </aside>
  );
};
