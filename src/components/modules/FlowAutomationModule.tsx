import React, { useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Puzzle,
  Download,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import {
  downloadWindowsInstallerBat,
  exportSmartFlowExtensionPackage,
} from '../../core/export/ExportEngine';

const FLOW_URLS = [
  { label: 'Google Flow (flow.google.com)', value: 'https://flow.google.com/' },
  { label: 'Google Labs Flow (labs.google/fx/tools/flow)', value: 'https://labs.google/fx/tools/flow' },
  { label: 'Google Labs ImageFX (labs.google/fx/tools/image-fx)', value: 'https://labs.google/fx/tools/image-fx' },
  { label: 'Google Labs Whisk (labs.google/fx/tools/whisk)', value: 'https://labs.google/fx/tools/whisk' },
];

export const FlowAutomationModule: React.FC = () => {
  const {
    extensionConnected,
    extensionVersion,
    extensionPaused,
    flowTargetUrl,
    setFlowTargetUrl,
    flowOptions,
    setFlowOptions,
    flowTasks,
    addFlowTask,
    runFlowAutomationQueue,
    executeSingleFlowTask,
    clearFlowTasks,
    outputFolder,
    setActiveNav,
  } = useStudio();

  const [newPrompt, setNewPrompt] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Vector Icon Sheet');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    addFlowTask(newPrompt.trim(), newCategory, true);
    setNewPrompt('');
  };

  const handleCopyPrompt = (id: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            FLOW AUTOMATION (CHROME EXTENSION BRIDGE v4.4)
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Architecture: SS SMART STUDIO → FLOW CONTROLLER → SS SMART FLOW EXTENSION (v4.4) → flow.google.com (+ New Project → Exact Bottom-Right White Arrow Click).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void downloadWindowsInstallerBat()}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>1-Click Folder Creator v4.4 (.BAT)</span>
          </button>

          <button
            type="button"
            onClick={() => void exportSmartFlowExtensionPackage()}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 hover:bg-[var(--accent-soft)] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download v4.4 (.ZIP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('extension')}
            className={`px-3 py-1.5 text-xs font-semibold rounded border flex items-center gap-1.5 ${
              extensionConnected && extensionVersion === '4.4.0'
                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-950/30 text-amber-300 border-amber-500/40'
            }`}
          >
            <Puzzle className="w-3.5 h-3.5" />
            <span>
              {extensionConnected
                ? `● Extension v${extensionVersion || '4.4'} Active`
                : '⚠️ Extension v4.4 Not Loaded in Chrome'}
            </span>
          </button>
        </div>
      </div>

      {/* Live Status & 1-Click Installer Banner */}
      <div
        className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
          extensionConnected && extensionVersion === '4.4.0'
            ? 'border-emerald-500/40 bg-emerald-950/20'
            : 'border-amber-500/50 bg-amber-950/20'
        }`}
      >
        <div className="space-y-1">
          <div className="font-semibold text-[var(--text-primary)]">
            {extensionConnected && extensionVersion === '4.4.0'
              ? '✓ SS SMART FLOW v4.4 Active in Chrome — Bottom-Right White Arrow Button Auto-Click Ready!'
              : '⚠️ গুরুত্বপূর্ণ আপডেট (v4.4): উপরের Search বার সংঘর্ষ এবং নিচের সাদা অ্যারো (→) বাটনের পজিশন ফিক্স করা হয়েছে — নতুন v4.4 লোড করুন!'}
          </div>
          <p className="text-[var(--text-secondary)]">
            1. নিচের <strong>1-Click Folder Creator v4.4 (.BAT)</strong> বা <strong>Download v4.4 ZIP</strong> ডাউনলোড করুন। 2. <code className="text-[var(--text-primary)]">chrome://extensions</code>-এ গিয়ে আগের ভার্সন <strong>Remove</strong> করে <strong>Load unpacked</strong> দিয়ে নতুন <code>SS-SMART-FLOW-v4.4</code> ফোল্ডারটি সিলেক্ট করুন।
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void downloadWindowsInstallerBat()}
            className="px-3.5 py-2 rounded font-bold bg-[var(--accent-primary)] text-slate-950 whitespace-nowrap"
          >
            1-Click Folder Creator v4.4 (.BAT)
          </button>
          <button
            type="button"
            onClick={() => void exportSmartFlowExtensionPackage()}
            className="px-3.5 py-2 rounded font-semibold bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/50 whitespace-nowrap"
          >
            Download v4.4 ZIP
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('extension')}
            className="px-3 py-2 rounded font-semibold bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] whitespace-nowrap"
          >
            Copy Files Manually
          </button>
        </div>
      </div>

      {/* Target Flow URL Configuration */}
      <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 md:grid-cols-12 gap-4 items-center text-xs">
        <div className="md:col-span-4">
          <label className="block font-semibold text-[var(--text-primary)] mb-1">
            Target Chrome Workflow URL
          </label>
          <select
            value={FLOW_URLS.some((u) => u.value === flowTargetUrl) ? flowTargetUrl : 'custom'}
            onChange={(e) => {
              if (e.target.value !== 'custom') setFlowTargetUrl(e.target.value);
            }}
            className="w-full px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
          >
            {FLOW_URLS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-8">
          <label className="block text-[var(--text-secondary)] mb-1">
            Active Destination URL (Opened by SS SMART FLOW Extension)
          </label>
          <input
            type="text"
            value={flowTargetUrl}
            onChange={(e) => setFlowTargetUrl(e.target.value)}
            className="w-full px-3 py-1.5 font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 4 Flow Automation Options + Task Creator (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              FLOW AUTOMATION OPTIONS
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { key: 'autoSubmit', label: 'Auto Submit (Inject Prompt in Flow)' },
                { key: 'autoGenerate', label: 'Auto Generate (Click Generate Button)' },
                { key: 'autoDetectResult', label: 'Auto Detect Result (Watch DOM Image)' },
                { key: 'autoDownload', label: 'Auto Download (Save to PC)' },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={flowOptions[opt.key as keyof typeof flowOptions]}
                    onChange={(e) =>
                      setFlowOptions((prev) => ({
                        ...prev,
                        [opt.key]: e.target.checked,
                      }))
                    }
                    className="rounded accent-[var(--accent-primary)]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Add Task to Flow Queue */}
          <form
            onSubmit={handleAddPrompt}
            className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3"
          >
            <div className="text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              DISPATCH PROMPT TO CHROME FLOW
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                Workflow Category
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                Prompt / Workflow Instruction
              </label>
              <textarea
                rows={3}
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Enter prompt to send directly to Google Flow via Chrome Extension..."
                className="w-full px-3 py-2 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3 rounded text-xs font-semibold bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Send to Chrome Extension & Flow</span>
            </button>
          </form>
        </div>

        {/* Right: Active Flow Queue (8 cols) */}
        <div className="lg:col-span-8 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5 text-xs">
            <span className="font-semibold text-[var(--text-primary)]">
              CHROME EXTENSION FLOW DISPATCH QUEUE ({flowTasks.length})
            </span>
            {flowTasks.length > 0 && (
              <button
                type="button"
                onClick={clearFlowTasks}
                className="text-xs text-rose-400 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Queue</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {flowTasks.map((task) => {
              const isBusy =
                task.status === 'Submitted' ||
                task.status === 'Generating' ||
                task.status === 'Detected';

              return (
                <div
                  key={task.id}
                  className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text-primary)] text-sm">
                      {task.category}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[var(--text-muted)]">{task.timestamp}</span>
                      <span
                        className={
                          task.status === 'Downloaded'
                            ? 'text-emerald-400 font-semibold'
                            : 'text-[var(--accent-primary)] font-semibold'
                        }
                      >
                        {task.status === 'Downloaded' ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sent to Chrome Flow
                          </span>
                        ) : isBusy ? (
                          <span className="inline-flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {task.status}...
                          </span>
                        ) : (
                          task.status
                        )}
                      </span>
                    </div>
                  </div>

                  <p className="text-[var(--text-secondary)] leading-relaxed select-all">
                    {task.prompt}
                  </p>

                  <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-primary)] transition-all duration-200"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {task.outputFile || `Target: ${flowTargetUrl}`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(task.id, task.prompt)}
                        className="px-2.5 py-1.5 rounded text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center gap-1"
                      >
                        {copiedId === task.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === task.id ? 'Copied' : 'Copy Prompt'}</span>
                      </button>

                      <a
                        href={`${flowTargetUrl}${flowTargetUrl.includes('?') ? '&' : '?'}ss_prompt=${encodeURIComponent(task.prompt)}#ss_prompt=${encodeURIComponent(task.prompt)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          void navigator.clipboard.writeText(task.prompt).catch(() => {});
                          void executeSingleFlowTask(task.id, task.prompt, task.category, true);
                        }}
                        className="px-3 py-1.5 rounded text-xs font-semibold bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Launch in Chrome Flow Tab</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
