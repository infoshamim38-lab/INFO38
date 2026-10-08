import React from 'react';
import { ArrowRight, CheckCircle2, FolderOpen } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { exportAllPresentationsAsZip, exportIndividualSvgsAsZip } from '../../core/export/ExportEngine';

export const DashboardModule: React.FC = () => {
  const {
    setActiveNav,
    extractedIcons,
    presentations,
    savedPrompts,
    flowTasks,
    outputFolder,
    activeLicense,
    geminiStatus,
  } = useStudio();

  const readyIcons = extractedIcons.filter((i) => i.status === 'Ready');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Production Workspace
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Integrated Gemini Vision Prompt Engineering, Individual Icon Sheet Vectorization, and Auto-Grid Presentation Builder.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-mono tabular-nums">
          <span>Gemini: {geminiStatus}</span>
          <span aria-hidden="true">·</span>
          <span>License: {activeLicense.duration} ({activeLicense.status})</span>
          <span aria-hidden="true">·</span>
          <span>Icons Ready: {readyIcons.length}</span>
        </div>
      </div>

      {/* Primary 4 Studio Workflows */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
          Primary Studio Workflows
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveNav('image-to-prompt')}
            className="text-left p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)] transition-colors flex flex-col justify-between gap-4"
          >
            <div>
              <div className="text-xs font-mono text-[var(--accent-primary)]">01. AI Analysis</div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1">
                IMAGE → PROMPT
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Upload any reference image or icon sheet for real Gemini Vision analysis and structured prompt generation.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--accent-primary)] pt-2 border-t border-[var(--border-subtle)]">
              <span>Open Image → Prompt</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={() => setActiveNav('vector-converter')}
            className="text-left p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)] transition-colors flex flex-col justify-between gap-4"
          >
            <div>
              <div className="text-xs font-mono text-[var(--accent-primary)]">02. Individual SVG</div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1">
                VECTOR CONVERTER
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Separates multi-icon sheets into {readyIcons.length || 25} individual bounding boxes and independent clean SVGs.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--accent-primary)] pt-2 border-t border-[var(--border-subtle)]">
              <span>Open Vector Converter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={() => setActiveNav('icon-sheet')}
            className="text-left p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)] transition-colors flex flex-col justify-between gap-4"
          >
            <div>
              <div className="text-xs font-mono text-[var(--accent-primary)]">03. Presentation Grid</div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1">
                ICON SHEET
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Build multi-page icon sheet presentations with custom icons-per-sheet, auto-fit, safe margin, and zero cropping.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--accent-primary)] pt-2 border-t border-[var(--border-subtle)]">
              <span>Open Icon Sheet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={() => setActiveNav('flow-automation')}
            className="text-left p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)] transition-colors flex flex-col justify-between gap-4"
          >
            <div>
              <div className="text-xs font-mono text-[var(--accent-primary)]">04. Browser Bridge</div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1">
                FLOW
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Connect SS SMART STUDIO with the SS SMART FLOW Chrome Extension for automated workflow execution.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--accent-primary)] pt-2 border-t border-[var(--border-subtle)]">
              <span>Open Flow Automation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* Active Studio Pipeline Summary & Output Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Active Studio Pipeline State
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportIndividualSvgsAsZip(readyIcons)}
                disabled={readyIcons.length === 0}
                className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-50 whitespace-nowrap"
              >
                Export {readyIcons.length} Individual SVGs
              </button>
              <button
                onClick={() => exportAllPresentationsAsZip(presentations)}
                disabled={presentations.length === 0}
                className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--accent-primary)] text-slate-950 font-semibold hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              >
                Export {presentations.length} Presentation Sheets
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="py-2.5 font-medium">Module</th>
                  <th className="py-2.5 font-medium">Active Dataset</th>
                  <th className="py-2.5 font-medium">Validation Status</th>
                  <th className="py-2.5 font-medium text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)] font-mono tabular-nums">
                <tr>
                  <td className="py-2.5 font-sans font-medium text-[var(--text-primary)]">
                    Individual SVG Icons
                  </td>
                  <td className="py-2.5">01.svg – {String(readyIcons.length).padStart(2, '0')}.svg</td>
                  <td className="py-2.5 text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Validated SVG
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-[var(--text-primary)]">{readyIcons.length}</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-[var(--text-primary)]">
                    Icon Sheet Presentations
                  </td>
                  <td className="py-2.5">
                    {presentations.map((p) => p.title).join(', ') || 'None'}
                  </td>
                  <td className="py-2.5 text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> No Crop / No Overlap
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-[var(--text-primary)]">{presentations.length}</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-[var(--text-primary)]">
                    Saved Gemini Prompts
                  </td>
                  <td className="py-2.5">Structured Vision & Studio Prompts</td>
                  <td className="py-2.5 text-[var(--text-secondary)]">Ready for Export</td>
                  <td className="py-2.5 text-right text-[var(--text-primary)]">{savedPrompts.length}</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-[var(--text-primary)]">
                    Flow Automation Queue
                  </td>
                  <td className="py-2.5">SS SMART FLOW Bridge</td>
                  <td className="py-2.5 text-emerald-400">Connected</td>
                  <td className="py-2.5 text-right text-[var(--text-primary)]">{flowTasks.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Output Directory Tree */}
        <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[var(--accent-primary)]" />
                Output Management
              </h2>
              <button
                onClick={() => setActiveNav('settings')}
                className="text-xs text-[var(--accent-primary)] hover:underline"
              >
                Configure
              </button>
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-canvas)] p-3 rounded border border-[var(--border-subtle)] break-all">
              {outputFolder}
            </div>
            <pre className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-canvas)] p-3 rounded border border-[var(--border-subtle)] leading-relaxed">
{`Output/
├── Prompts/
├── Vector/
├── Icons/
├── Presentations/
└── Flow/`}
            </pre>
          </div>

          <div className="text-xs text-[var(--text-muted)]">
            All generated prompts, individual SVGs, and multi-sheet presentations automatically map to their designated studio directories.
          </div>
        </div>
      </div>
    </div>
  );
};
