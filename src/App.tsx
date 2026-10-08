/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { StudioProvider, useStudio } from './context/StudioContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { DashboardModule } from './components/modules/DashboardModule';
import { ImageToPromptModule } from './components/modules/ImageToPromptModule';
import { PromptStudioModule } from './components/modules/PromptStudioModule';
import { VectorConverterModule } from './components/modules/VectorConverterModule';
import { IconExtractorModule } from './components/modules/IconExtractorModule';
import { IconSheetModule } from './components/modules/IconSheetModule';
import { FlowAutomationModule } from './components/modules/FlowAutomationModule';
import { ExtensionModule } from './components/modules/ExtensionModule';
import { SettingsModule } from './components/modules/SettingsModule';
import {
  exportAllPresentationsAsZip,
  exportIndividualSvgsAsZip,
} from './core/export/ExportEngine';

const StudioWorkspace: React.FC = () => {
  const {
    activeNav,
    setActiveNav,
    extractedIcons,
    setExtractedIcons,
    presentations,
  } = useStudio();

  const handleQuickExport = () => {
    if (activeNav === 'icon-sheet' && presentations.length > 0) {
      void exportAllPresentationsAsZip(presentations);
    } else if (extractedIcons.length > 0) {
      void exportIndividualSvgsAsZip(extractedIcons);
    }
  };

  // Global Keyboard Shortcuts (Section 47: Ctrl+O, Ctrl+S, Ctrl+E, Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setActiveNav('image-to-prompt');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleQuickExport();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
      } else if (!isInput && e.key === 'Delete' && activeNav === 'icon-extractor') {
        setExtractedIcons((prev) => prev.slice(0, -1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNav, presentations, extractedIcons]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <TopHeader onQuickExport={handleQuickExport} />

      <div className="flex-1 flex min-h-0">
        <Sidebar />

        <main className="flex-1 p-6 overflow-y-auto">
          {activeNav === 'dashboard' && <DashboardModule />}
          {activeNav === 'image-to-prompt' && <ImageToPromptModule />}
          {activeNav === 'prompt-studio' && <PromptStudioModule />}
          {activeNav === 'vector-converter' && <VectorConverterModule />}
          {activeNav === 'icon-extractor' && <IconExtractorModule />}
          {activeNav === 'icon-sheet' && <IconSheetModule />}
          {activeNav === 'flow-automation' && <FlowAutomationModule />}
          {activeNav === 'extension' && <ExtensionModule />}
          {activeNav === 'settings' && <SettingsModule />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <StudioProvider>
      <StudioWorkspace />
    </StudioProvider>
  );
}
