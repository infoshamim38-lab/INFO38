import React, { useRef, useState } from 'react';
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { IconVariant } from '../../types/studio';
import {
  exportIndividualSvgsAsZip,
  exportSingleSvg,
} from '../../core/export/ExportEngine';
import { generateSample25IconSheetDataUrl } from '../../core/vector-engine/IconDetectionAndVectorEngine';

const VARIANTS: { id: IconVariant; label: string }[] = [
  { id: 'VARIANT 01', label: 'VARIANT 01 · FULL BLACK SOLID' },
  { id: 'VARIANT 02', label: 'VARIANT 02 · DOUBLE OUTLINE' },
  { id: 'VARIANT 03', label: 'VARIANT 03 · SINGLE OUTLINE' },
];

export const VectorConverterModule: React.FC = () => {
  const {
    sourceSheetImage,
    extractedIcons,
    activeVariant,
    setActiveVariant,
    batchProgress,
    runSheetDetectionAndVectorBatch,
    retryIconConversion,
    skipFailedIcon,
    setActiveNav,
  } = useStudio();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      void runSheetDetectionAndVectorBatch(dataUrl, activeVariant);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleLoadSample25Sheet = () => {
    const sampleUrl = generateSample25IconSheetDataUrl();
    void runSheetDetectionAndVectorBatch(sampleUrl, activeVariant);
  };

  const readyIcons = extractedIcons.filter((ic) => ic.status === 'Ready');
  const selectedIcon =
    extractedIcons.find((ic) => ic.id === selectedIconId) || readyIcons[0] || null;

  const progressPercent =
    batchProgress.total > 0
      ? Math.round((batchProgress.completed / batchProgress.total) * 100)
      : 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Three Variants Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            VECTOR CONVERTER
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Automatically detects and separates multi-icon sheets into independent bounding boxes and clean individual SVG files (01.svg – {String(extractedIcons.length || 25).padStart(2, '0')}.svg).
          </p>
        </div>

        {/* 3 Icon Variants Selector */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveVariant(v.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                activeVariant === v.id
                  ? 'bg-[var(--accent-primary)] text-slate-950 font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Progress Bar (Section 39 specification) */}
      <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="text-[var(--text-primary)] font-semibold">
              Processing: {batchProgress.completed} / {batchProgress.total || extractedIcons.length}
            </span>
            <span className="text-[var(--text-secondary)]">
              Completed: {batchProgress.completed} · Failed: {batchProgress.failed} · Pending: {batchProgress.pending}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--bg-canvas)] overflow-hidden border border-[var(--border-subtle)]">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Icon Sheet</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample25Sheet}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload 25-Icon Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => exportIndividualSvgsAsZip(readyIcons)}
            disabled={readyIcons.length === 0}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export {readyIcons.length} SVGs (ZIP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('icon-sheet')}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1 whitespace-nowrap"
          >
            <span>Open Icon Sheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
          />
        </div>
      </div>

      {/* Main Grid: Source Sheet Detection + Individual SVG Grid + Single SVG Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Uploaded Icon Sheet + Bounding Box Overlay (4 cols) */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="lg:col-span-4 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">
              ICON SHEET DETECTION
            </span>
            <span className="font-mono text-[var(--accent-primary)]">
              {extractedIcons.length} Icons Detected
            </span>
          </div>

          {sourceSheetImage && (
            <div className="rounded border border-[var(--border-subtle)] bg-white p-2 flex items-center justify-center">
              <img
                src={sourceSheetImage}
                alt="Source Icon Sheet"
                referrerPolicy="no-referrer"
                className="max-h-72 w-auto object-contain"
              />
            </div>
          )}

          {/* Selected Icon SVG Inspector */}
          {selectedIcon && (
            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  Inspector: {selectedIcon.name}
                </span>
                <button
                  type="button"
                  onClick={() => exportSingleSvg(selectedIcon)}
                  className="px-2.5 py-1 rounded bg-[var(--accent-primary)] text-slate-950 font-semibold hover:opacity-90"
                >
                  Download {selectedIcon.name}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded bg-white border border-[var(--border-subtle)] flex flex-col items-center justify-center h-28">
                  <div
                    className="w-16 h-16 flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: selectedIcon.svgContent }}
                  />
                  <span className="text-[10px] font-mono text-slate-500 mt-1">
                    Vector SVG ({selectedIcon.variant})
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] space-y-1">
                  <div>File: {selectedIcon.name}</div>
                  <div>
                    ViewBox: 0 0 {selectedIcon.originalWidth} {selectedIcon.originalHeight}
                  </div>
                  <div>Aspect: {selectedIcon.aspectRatio}:1</div>
                  <div className="text-emerald-400">✓ Clean Paths</div>
                  <div className="text-emerald-400">✓ No Background</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Individual SVG Files Grid (01.svg .. 25.svg) (8 cols) */}
        <div className="lg:col-span-8 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-[var(--border-subtle)] pb-2.5">
            <span className="font-semibold text-[var(--text-secondary)]">
              INDIVIDUAL SVG FILES (01.svg – {String(extractedIcons.length).padStart(2, '0')}.svg)
            </span>
            <span className="text-[var(--text-muted)]">
              Click any icon to inspect or download individually
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[540px] overflow-y-auto pr-1">
            {extractedIcons.map((icon) => {
              const isSelected = selectedIcon?.id === icon.id;
              if (icon.status === 'Failed') {
                return (
                  <div
                    key={icon.id}
                    className="p-3 rounded border border-rose-500/50 bg-rose-950/20 flex flex-col justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono text-rose-300">
                      <span>{icon.name}</span>
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[11px] text-rose-200">
                      Vector conversion failed.
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => retryIconConversion(icon.id)}
                        className="flex-1 py-1 rounded bg-rose-500 text-white text-[11px] font-semibold"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => skipFailedIcon(icon.id)}
                        className="flex-1 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[11px]"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={icon.id}
                  onClick={() => setSelectedIconId(icon.id)}
                  className={`cursor-pointer p-3 rounded border transition-colors flex flex-col items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--accent-primary)]/60'
                  }`}
                >
                  <div className="w-full flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                    <span>{icon.name}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>

                  <div className="w-20 h-20 rounded bg-white p-2 flex items-center justify-center border border-slate-200">
                    <div
                      className="w-full h-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: icon.svgContent }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportSingleSvg(icon);
                    }}
                    className="w-full py-1 text-[11px] font-medium rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                  >
                    Export SVG
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
