import React, { useEffect, useState } from 'react';
import { Download, Pause, Play, PowerOff, Power, Copy, Check, FileCode } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import {
  downloadWindowsInstallerBat,
  exportSmartFlowExtensionPackage,
} from '../../core/export/ExportEngine';

export const ExtensionModule: React.FC = () => {
  const {
    extensionConnected,
    setExtensionConnected,
    extensionPaused,
    setExtensionPaused,
  } = useStudio();

  const [extFiles, setExtFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>('manifest.json');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/extension/files')
      .then((r) => r.json())
      .then((data) => {
        if (data?.files) setExtFiles(data.files);
      })
      .catch(() => {});
  }, []);

  const handleCopyCode = (filename: string) => {
    const content = extFiles[filename];
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 1600);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            SS SMART FLOW (v4.1)
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Auto-Paste &amp; Hardware Auto-Generate Chrome Extension bridge connecting SS SMART STUDIO with Google Flow (`labs.google/fx/tools/flow`).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void downloadWindowsInstallerBat()}
            className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>1-Click Folder Creator v4.1 (.BAT)</span>
          </button>
          <button
            type="button"
            onClick={() => void exportSmartFlowExtensionPackage()}
            className="px-3.5 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 hover:bg-[var(--accent-soft)] whitespace-nowrap"
          >
            Download Extension v4.1 (.ZIP)
          </button>
        </div>
      </div>

      {/* Minimal Extension UI Card (Section 36 exact specification) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="p-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <span className="text-sm font-bold tracking-wide text-[var(--text-primary)]">
              SS SMART FLOW
            </span>
            <span
              className={`text-xs font-mono font-semibold ${
                extensionConnected ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ● {extensionConnected ? (extensionPaused ? 'Paused' : 'Connected') : 'Disconnected'}
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)]">Studio</span>
              <span className="text-[var(--text-primary)]">
                {extensionConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)]">Browser</span>
              <span className="text-[var(--text-primary)]">
                {extensionConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)]">Flow</span>
              <span className="text-[var(--text-primary)]">
                {!extensionConnected ? 'Stopped' : extensionPaused ? 'Paused' : 'Ready'}
              </span>
            </div>
          </div>

          {/* [Pause] and [Disconnect] buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!extensionConnected}
              onClick={() => setExtensionPaused(!extensionPaused)}
              className="flex-1 py-2 px-3 rounded text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {extensionPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{extensionPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExtensionConnected(!extensionConnected);
                if (!extensionConnected) setExtensionPaused(false);
              }}
              className={`flex-1 py-2 px-3 rounded text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                extensionConnected
                  ? 'bg-rose-950/30 text-rose-300 border-rose-500/40 hover:bg-rose-950/50'
                  : 'bg-[var(--accent-primary)] text-slate-950 border-[var(--accent-primary)]'
              }`}
            >
              {extensionConnected ? (
                <>
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </>
              ) : (
                <>
                  <Power className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Extension Installation & Bridge Notes */}
        <div className="p-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 text-xs text-[var(--text-secondary)]">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            How to Install or Update SS SMART FLOW v4.0
          </div>
          <ol className="list-decimal list-inside space-y-2 leading-relaxed">
            <li>
              Click <strong>Download Extension v4.0 (.ZIP)</strong> or <strong>1-Click Folder Creator v4.0 (.BAT)</strong> above.
            </li>
            <li>
              Open <code className="text-[var(--text-primary)]">chrome://extensions</code> in Google Chrome and enable <strong>Developer mode</strong>.
            </li>
            <li>
              Click <strong>Load unpacked</strong> and select the <code className="text-[var(--text-primary)]">SS-SMART-FLOW-v4.0</code> folder (and remove any older v2.5/v3.5 version, or click <strong>Reload ↻</strong>).
            </li>
            <li>
              Refresh this page once—now clicking <strong>Send to Flow</strong> will open Google Flow, automatically paste the prompt into the editor, and click the Generate button!
            </li>
          </ol>
        </div>
      </div>

      {/* Direct Source Code Viewer & One-Click Copy (in case browser blocks ZIP downloads) */}
      <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
            <FileCode className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Extension Source Files (One-Click Copy Backup)</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {Object.keys(extFiles).map((fname) => (
              <button
                key={fname}
                type="button"
                onClick={() => setSelectedFile(fname)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  selectedFile === fname
                    ? 'bg-[var(--accent-primary)] text-slate-950 font-semibold'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                {fname}
              </button>
            ))}
          </div>
        </div>

        {extFiles[selectedFile] && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[var(--accent-primary)]">{selectedFile}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(selectedFile)}
                className="px-3 py-1 rounded text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1.5"
              >
                {copiedFile === selectedFile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied {selectedFile}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy {selectedFile}</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto max-h-72">
              {extFiles[selectedFile]}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
