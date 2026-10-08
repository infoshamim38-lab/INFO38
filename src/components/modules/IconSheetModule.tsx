import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Upload,
  Download,
  Wrench,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import {
  exportAllPresentationsAsZip,
  exportIndividualSvgsAsZip,
  exportPresentationAsRaster,
  exportPresentationAsSvg,
} from '../../core/export/ExportEngine';
import { validateSingleSvg } from '../../core/vector-engine/IconDetectionAndVectorEngine';
import { ExtractedIconItem } from '../../types/studio';

const PRESET_COUNTS = [10, 25, 50, 100];

export const IconSheetModule: React.FC = () => {
  const {
    extractedIcons,
    setExtractedIcons,
    presentationSettings,
    setPresentationSettings,
    presentations,
    selectedPresentationIndex,
    setSelectedPresentationIndex,
    regeneratePresentations,
    autoFixPresentations,
  } = useStudio();

  const svgUploadRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [showSafeGrid, setShowSafeGrid] = useState<boolean>(true);

  const currentPresentation =
    presentations[selectedPresentationIndex] || presentations[0] || null;

  const handleSvgFilesUpload = async (files: FileList) => {
    const newItems: ExtractedIconItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.svg') || file.type === 'image/svg+xml') {
        const text = await file.text();
        const idx = extractedIcons.length + newItems.length + 1;
        const num = String(idx).padStart(2, '0');
        newItems.push({
          id: `uploaded-svg-${Date.now()}-${i}`,
          index: idx,
          name: `${num}.svg`,
          bbox: { x: 0, y: 0, width: 96, height: 96 },
          originalWidth: 96,
          originalHeight: 96,
          aspectRatio: 1,
          croppedDataUrl: '',
          svgContent: text,
          variant: 'VARIANT 01',
          status: 'Ready',
          validation: validateSingleSvg(text, 96, 96),
        });
      }
    }
    if (newItems.length > 0) {
      setExtractedIcons((prev) => [...prev, ...newItems]);
    }
  };

  const handleSimulate100Icons = () => {
    if (extractedIcons.length === 0) return;
    const batch100: ExtractedIconItem[] = [];
    for (let i = 0; i < 100; i++) {
      const base = extractedIcons[i % extractedIcons.length];
      const num = String(i + 1).padStart(2, '0');
      batch100.push({
        ...base,
        id: `sim-100-${i}`,
        index: i + 1,
        name: `${num}.svg`,
      });
    }
    setExtractedIcons(batch100);
    setSelectedPresentationIndex(0);
  };

  const updateNumericOrAuto = (
    key: 'columns' | 'rows' | 'canvasWidth' | 'canvasHeight' | 'iconSize' | 'spacing' | 'padding' | 'margin',
    val: string
  ) => {
    if (val.trim().toLowerCase() === 'auto' || val.trim() === '') {
      setPresentationSettings((prev) => ({ ...prev, [key]: 'Auto' }));
    } else {
      const num = Number(val);
      if (!Number.isNaN(num) && num > 0) {
        setPresentationSettings((prev) => ({ ...prev, [key]: num }));
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            ICON SHEET PRESENTATION BUILDER
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Automatic multi-presentation grid calculation, proportional aspect ratio scaling, safe area enforcement, and pre-export SVG validation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => svgUploadRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add SVG Icons</span>
          </button>

          <button
            type="button"
            onClick={handleSimulate100Icons}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
          >
            Load 100 SVG Icons Test
          </button>

          <button
            type="button"
            onClick={() => exportIndividualSvgsAsZip(extractedIcons)}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]"
          >
            Export Individual SVGs
          </button>

          <button
            type="button"
            onClick={() => exportAllPresentationsAsZip(presentations)}
            disabled={presentations.length === 0}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ZIP (All Sheets)</span>
          </button>

          <input
            ref={svgUploadRef}
            type="file"
            accept=".svg,image/svg+xml"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleSvgFilesUpload(e.target.files);
            }}
          />
        </div>
      </div>

      {/* Main 12-Col Layout: Left Presentation Settings + Presentations List (4 cols) | Right Preview & Validation (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Settings & Presentations List (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* PRESENTATION SETTINGS PANEL (Section 25 exact controls) */}
          <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                PRESENTATION SETTINGS
              </span>
              <button
                type="button"
                onClick={autoFixPresentations}
                className="text-xs text-[var(--accent-primary)] hover:underline"
              >
                Reset to Auto
              </button>
            </div>

            {/* Icons Per Presentation */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Icons Per Presentation
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={presentationSettings.iconsPerPresentation}
                  onChange={(e) =>
                    setPresentationSettings((prev) => ({
                      ...prev,
                      iconsPerPresentation: Math.max(1, Number(e.target.value) || 25),
                    }))
                  }
                  className="w-24 px-3 py-1.5 text-xs font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
                <div className="flex items-center gap-1">
                  {PRESET_COUNTS.map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() =>
                        setPresentationSettings((prev) => ({
                          ...prev,
                          iconsPerPresentation: cnt,
                        }))
                      }
                      className={`px-2 py-1 text-xs font-mono rounded border ${
                        presentationSettings.iconsPerPresentation === cnt
                          ? 'bg-[var(--accent-primary)] text-slate-950 border-[var(--accent-primary)] font-semibold'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid & Dimension Inputs */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {[
                { key: 'columns', label: 'Columns' },
                { key: 'rows', label: 'Rows' },
                { key: 'canvasWidth', label: 'Canvas Width' },
                { key: 'canvasHeight', label: 'Canvas Height' },
                { key: 'iconSize', label: 'Icon Size' },
                { key: 'spacing', label: 'Spacing' },
                { key: 'padding', label: 'Padding' },
                { key: 'margin', label: 'Margin' },
              ].map((field) => {
                const val = presentationSettings[field.key as keyof typeof presentationSettings];
                return (
                  <div key={field.key}>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={String(val)}
                      onChange={(e) =>
                        updateNumericOrAuto(field.key as any, e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                );
              })}
            </div>

            {/* 5 Mandatory Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
              {[
                { key: 'autoFit', label: 'Auto Fit' },
                { key: 'equalSpacing', label: 'Equal Spacing' },
                { key: 'preserveAspectRatio', label: 'Preserve Aspect Ratio' },
                { key: 'preventCropping', label: 'Prevent Cropping' },
                { key: 'preventOverlap', label: 'Prevent Overlap' },
              ].map((chk) => (
                <label
                  key={chk.key}
                  className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(presentationSettings[chk.key as keyof typeof presentationSettings])}
                    onChange={(e) =>
                      setPresentationSettings((prev) => ({
                        ...prev,
                        [chk.key]: e.target.checked,
                      }))
                    }
                    className="rounded accent-[var(--accent-primary)]"
                  />
                  <span>{chk.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* MULTIPLE PRESENTATIONS LIST (Section 32 exact format) */}
          <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-primary)]">
                Presentations ({presentations.length})
              </span>
              <span className="font-mono text-[var(--text-muted)]">
                Total: {extractedIcons.length} Icons
              </span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {presentations.map((p, idx) => {
                const isSelected = idx === selectedPresentationIndex;
                const num = String(p.index).padStart(2, '0');
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPresentationIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/50'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>
                      {num} &nbsp; {p.placedIcons.length} Icons ({p.rangeLabel})
                    </span>
                    <span className={p.allPassed ? 'text-emerald-400' : 'text-amber-400'}>
                      {p.allPassed ? '✓ Ready' : '! Review'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Presentation Canvas Preview + Validation Checklist + Export (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {currentPresentation ? (
            <>
              {/* Top Preview Controls */}
              <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-mono text-[var(--text-primary)]">
                    {currentPresentation.title.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {currentPresentation.rangeLabel} · {currentPresentation.columns}×{currentPresentation.rows} Grid · {currentPresentation.canvasWidth}×{currentPresentation.canvasHeight}px
                  </span>
                </div>

                {/* Zoom / Fit / Safe Area / Regenerate */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                    className="p-1.5 rounded bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono px-2 text-[var(--text-secondary)]">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
                    className="p-1.5 rounded bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="px-2.5 py-1 text-xs rounded bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Fit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSafeGrid((s) => !s)}
                    className={`px-2.5 py-1 text-xs rounded border ${
                      showSafeGrid
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]/40'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                    }`}
                  >
                    Safe Margin Box
                  </button>
                  <button
                    type="button"
                    onClick={regeneratePresentations}
                    className="px-2.5 py-1 text-xs rounded bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Interactive Presentation Canvas Viewport */}
              <div className="p-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-auto flex items-center justify-center min-h-[440px] max-h-[540px]">
                <div
                  className="bg-white rounded shadow-sm border border-slate-300 transition-transform origin-center relative"
                  style={{
                    width: `${Math.min(560, currentPresentation.canvasWidth * 0.45) * zoom}px`,
                    aspectRatio: `${currentPresentation.canvasWidth} / ${currentPresentation.canvasHeight}`,
                  }}
                >
                  <svg
                    viewBox={`0 0 ${currentPresentation.canvasWidth} ${currentPresentation.canvasHeight}`}
                    className="w-full h-full block"
                  >
                    <rect
                      width={currentPresentation.canvasWidth}
                      height={currentPresentation.canvasHeight}
                      fill="#FFFFFF"
                    />

                    {/* Safe Canvas Boundary Indicator */}
                    {showSafeGrid && (
                      <rect
                        x={currentPresentation.margin}
                        y={currentPresentation.margin}
                        width={currentPresentation.canvasWidth - currentPresentation.margin * 2}
                        height={currentPresentation.canvasHeight - currentPresentation.margin * 2}
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="2"
                        strokeDasharray="8 6"
                      />
                    )}

                    {currentPresentation.placedIcons.map((p) => {
                      const vbMatch = p.icon.svgContent.match(/viewBox=["']([^"']+)["']/i);
                      const viewBox = vbMatch
                        ? vbMatch[1]
                        : `0 0 ${p.icon.originalWidth} ${p.icon.originalHeight}`;
                      const innerMatch = p.icon.svgContent.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
                      const innerMarkup = innerMatch ? innerMatch[1] : p.icon.svgContent;

                      return (
                        <g key={p.icon.id}>
                          {showSafeGrid && (
                            <rect
                              x={p.cellX}
                              y={p.cellY}
                              width={p.cellWidth}
                              height={p.cellHeight}
                              fill="none"
                              stroke="#CBD5E1"
                              strokeWidth="1.5"
                            />
                          )}
                          <svg
                            x={p.drawX}
                            y={p.drawY}
                            width={p.drawWidth}
                            height={p.drawHeight}
                            viewBox={viewBox}
                            preserveAspectRatio="xMidYMid meet"
                            dangerouslySetInnerHTML={{ __html: innerMarkup }}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Pre-Export Presentation Validation & Export Bar (Sections 31 & 33) */}
              <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    PRE-EXPORT PRESENTATION VALIDATION
                  </span>

                  {!currentPresentation.allPassed && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={autoFixPresentations}
                        className="px-3 py-1 text-xs font-semibold rounded bg-amber-400 text-slate-950 flex items-center gap-1"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Auto Fix</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 8 Mandatory Validation Checks */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {[
                    { key: 'isComplete', label: 'Complete' },
                    { key: 'insideCanvas', label: 'Inside Canvas' },
                    { key: 'noCrop', label: 'No Crop' },
                    { key: 'noOverlap', label: 'No Overlap' },
                    { key: 'noBrokenPath', label: 'No Broken Path' },
                    { key: 'correctAspectRatio', label: 'Correct Aspect Ratio' },
                    { key: 'safeMargin', label: 'Safe Margin' },
                    { key: 'validSvg', label: 'Valid SVG' },
                  ].map((item) => {
                    const passed =
                      currentPresentation.validation[
                        item.key as keyof typeof currentPresentation.validation
                      ];
                    return (
                      <div
                        key={item.key}
                        className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 ${
                          passed
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-950/30 border-rose-500/40 text-rose-400'
                        }`}
                      >
                        {passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Export Formats: PNG, JPG, SVG, ZIP */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-secondary)]">
                    Export <span className="font-mono text-[var(--text-primary)]">{currentPresentation.title}</span>:
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!currentPresentation.allPassed}
                      onClick={() => exportPresentationAsRaster(currentPresentation, 'png')}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40"
                    >
                      Export PNG (presentation-{String(currentPresentation.index).padStart(2, '0')}.png)
                    </button>

                    <button
                      type="button"
                      disabled={!currentPresentation.allPassed}
                      onClick={() => exportPresentationAsRaster(currentPresentation, 'jpg')}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40"
                    >
                      Export JPG
                    </button>

                    <button
                      type="button"
                      disabled={!currentPresentation.allPassed}
                      onClick={() => exportPresentationAsSvg(currentPresentation)}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40"
                    >
                      Export SVG
                    </button>

                    <button
                      type="button"
                      disabled={!currentPresentation.allPassed}
                      onClick={() => exportAllPresentationsAsZip(presentations)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-40"
                    >
                      Export All ZIP
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
