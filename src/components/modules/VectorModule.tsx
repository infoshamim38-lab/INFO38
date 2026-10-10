import React, { useRef, useState } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Eye,
  Grid,
  Sparkles,
  ArrowUpDown,
  CircleDot,
  Wand2,
  LayoutGrid,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { IconVariant } from '../../types/studio';
import {
  downloadPngFromSvg,
  downloadSvgFile,
  exportAllVectorsZip,
} from '../../core/export/ExportEngine';
import { generateSample25IconSheetDataUrl } from '../../core/vector-engine/IconDetectionAndVectorEngine';

const VARIANTS: IconVariant[] = [
  'COLOR VECTOR',
  'VARIANT 01',
  'VARIANT 02',
  'VARIANT 03',
];

export const VectorModule: React.FC = () => {
  const {
    sourceSheetImage,
    extractedIcons,
    activeVariant,
    setActiveVariant,
    batchProgress,
    runSheetDetectionAndVectorBatch,
    uploadAndSplitIconsToSingle,
    convertSingleIconsOneByOne,
    convertSingleIconById,
    swapSingleIconColors,
    sameSingleIconColors,
    regeneratePresentations,
    setActiveNav,
  } = useStudio();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendInputRef = useRef<HTMLInputElement>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [compareSplit, setCompareSplit] = useState<boolean>(false);

  const selectedIcon =
    extractedIcons.find((i) => i.id === selectedIconId) || extractedIcons[0] || null;

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Upload any number of icon sets OR single icons -> automatically splits all of them into Single Icons!
  const handleFilesUpload = async (fileList: FileList | File[], append = false) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const dataUrls: string[] = [];
    for (const file of files) {
      try {
        const url = await readFileAsDataUrl(file);
        dataUrls.push(url);
      } catch {
        // ignore
      }
    }

    if (dataUrls.length > 0) {
      await uploadAndSplitIconsToSingle(dataUrls, append);
    }
  };

  const handleVariantChange = (variant: IconVariant) => {
    setActiveVariant(variant);
  };

  const handleClickVectorConvertOneByOne = async () => {
    await convertSingleIconsOneByOne(activeVariant);
  };

  const handleClickIconSheetInstant = () => {
    regeneratePresentations();
    setActiveNav('icon-sheet');
  };

  const handleLoadSampleSet = () => {
    const sample = generateSample25IconSheetDataUrl();
    void runSheetDetectionAndVectorBatch(sample, 'COLOR VECTOR');
  };

  const vectorizedCount = extractedIcons.filter((i) => i.isVectorized && i.svgContent).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Main Workflow Actions (Upload -> Single Split -> 1-by-1 Vector -> Icon Sheet Presentation) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            SINGLE ICON SPLITTER & 1-BY-1 COLOR VECTOR ENGINE
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Upload any Icon Set or Single Icons → Auto-splits into Single Icons → Click <strong>Vector</strong> for 1-by-1 conversion → Click <strong>Icon Sheet</strong> to build Presentation!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Variant Selector */}
          <div className="flex items-center gap-1 p-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            {VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => handleVariantChange(v)}
                className={`px-2.5 py-1.5 text-xs font-mono font-semibold rounded transition-colors ${
                  activeVariant === v
                    ? 'bg-[var(--accent-primary)] text-slate-950'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Icon Set / Single</span>
          </button>

          <button
            type="button"
            onClick={() => appendInputRef.current?.click()}
            className="px-3 py-2 text-xs font-medium rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] flex items-center gap-1.5"
          >
            <span>+ Add More Icons</span>
          </button>

          {/* STEP 2 BUTTON: Click "Vector" to convert 1-by-1 */}
          <button
            type="button"
            onClick={() => void handleClickVectorConvertOneByOne()}
            disabled={extractedIcons.length === 0 || batchProgress.active}
            className="px-4 py-2 text-xs font-bold rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            <Wand2 className={`w-3.5 h-3.5 ${batchProgress.active ? 'animate-spin' : ''}`} />
            <span>
              {batchProgress.active
                ? `Vectorizing ${batchProgress.completed}/${batchProgress.total}...`
                : `Vector (1-by-1 Convert All ${extractedIcons.length})`}
            </span>
          </button>

          {/* STEP 3 BUTTON: Click "Icon Sheet" to immediately generate the saved presentation */}
          <button
            type="button"
            onClick={handleClickIconSheetInstant}
            disabled={extractedIcons.length === 0}
            className="px-4 py-2 text-xs font-bold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Icon Sheet (Build Presentation)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void handleFilesUpload(e.target.files, false);
                e.target.value = '';
              }
            }}
          />
          <input
            ref={appendInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void handleFilesUpload(e.target.files, true);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Live Status Bar */}
      <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-5 font-mono">
          <div>
            <span className="text-[var(--text-muted)]">SINGLE ICONS SEPARATED:</span>{' '}
            <span className="font-bold text-[var(--text-primary)]">{extractedIcons.length}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">CONVERTED VECTORS:</span>{' '}
            <span className="font-bold text-emerald-400">
              {vectorizedCount} / {extractedIcons.length}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">STATUS:</span>{' '}
            <span className="font-semibold text-[var(--accent-primary)]">
              {batchProgress.active
                ? `Converting 1-by-1 (${batchProgress.completed}/${batchProgress.total})...`
                : vectorizedCount === extractedIcons.length && extractedIcons.length > 0
                ? 'All Single Icons Converted to Editable SVG Vectors'
                : 'Ready — Click "Vector" to convert 1-by-1'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSampleSet}
            className="px-2.5 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
          >
            Load Sample Two-Tone Set
          </button>
          <button
            type="button"
            onClick={() => void exportAllVectorsZip(extractedIcons)}
            disabled={vectorizedCount === 0}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 hover:bg-[var(--accent-soft)] disabled:opacity-40 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All Vectors (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* SCREENSHOT #2 STYLE SINGLE ICON VECTOR GRID */}
      <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span>SEPARATED SINGLE ICONS & LIVE VECTOR CARDS ({extractedIcons.length})</span>
            <span className="text-[11px] font-normal text-[var(--text-secondary)]">
              · Use <strong>Swap</strong> to flip two-tone colors or <strong>Same</strong> to unify color per icon
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {extractedIcons.map((icon) => {
            const isSelected = selectedIcon?.id === icon.id;
            const isConverting = icon.status === 'Converting';
            const hasSvg = Boolean(icon.svgContent && icon.isVectorized !== false);

            return (
              <div
                key={icon.id}
                onClick={() => setSelectedIconId(icon.id)}
                className={`rounded-2xl bg-white text-slate-900 p-4 shadow-sm border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[250px] ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* Card Top Bar matching Screenshot #2: "#1 Vector" on left, "[↑↓ Swap] [● Same]" on right */}
                <div className="flex items-center justify-between gap-2 pb-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-tight ${
                      isConverting
                        ? 'bg-amber-100 text-amber-700 animate-pulse'
                        : hasSvg
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    #{icon.index} {isConverting ? 'Converting...' : hasSvg ? 'Vector' : 'Single'}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => swapSingleIconColors(icon.id)}
                      disabled={!hasSvg}
                      title="Swap Primary & Secondary Vector Colors"
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 flex items-center gap-1 transition-colors"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Swap</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => sameSingleIconColors(icon.id)}
                      disabled={!hasSvg}
                      title="Unify All Vector Paths to Same Color (or Toggle Back)"
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1 transition-colors disabled:opacity-40 ${
                        icon.isUnifiedColor
                          ? 'bg-pink-600 text-white border-pink-600'
                          : 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100'
                      }`}
                    >
                      <CircleDot className="w-3 h-3" />
                      <span>Same</span>
                    </button>
                  </div>
                </div>

                {/* Center Vector / Single Icon Display */}
                <div className="my-2 flex-1 flex items-center justify-center p-4 rounded-xl bg-white min-h-[150px]">
                  {isConverting ? (
                    <div className="flex flex-col items-center gap-2 text-xs text-indigo-600 font-semibold">
                      <RefreshCw className="w-7 h-7 animate-spin" />
                      <span>Converting to Vector...</span>
                    </div>
                  ) : hasSvg ? (
                    <div
                      className="w-36 h-36 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: icon.svgContent }}
                    />
                  ) : (
                    <img
                      src={icon.croppedPreviewUrl}
                      alt={icon.name}
                      className="w-36 h-36 object-contain"
                    />
                  )}
                </div>

                {/* Bottom Card Actions */}
                <div
                  className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => void convertSingleIconById(icon.id)}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    {hasSvg ? 'Re-Vectorize' : 'Convert Vector'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    {hasSvg && (
                      <>
                        <button
                          type="button"
                          onClick={() => downloadSvgFile(`${icon.name}.svg`, icon.svgContent)}
                          className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono font-semibold"
                        >
                          SVG
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void downloadPngFromSvg(`${icon.name}.png`, icon.svgContent, 1024)
                          }
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-semibold"
                        >
                          PNG
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Vector Inspector & SVG Validation for Selected Icon */}
      {selectedIcon && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[var(--text-primary)]">
                  INSPECTOR: #{selectedIcon.index} ({selectedIcon.name}.svg)
                </span>
                <span className="font-mono text-[var(--text-muted)]">
                  · {selectedIcon.validation.pathCount} SVG paths
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-[var(--bg-canvas)] px-2 py-1 rounded border border-[var(--border-subtle)] text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                    className="px-1.5 hover:text-[var(--accent-primary)]"
                  >
                    -
                  </button>
                  <span className="w-12 text-center">{zoomLevel}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                    className="px-1.5 hover:text-[var(--accent-primary)]"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 ${
                    showGrid
                      ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompareSplit(!compareSplit)}
                  className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 ${
                    compareSplit
                      ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Compare Original</span>
                </button>
              </div>
            </div>

            <div
              className={`rounded-lg border border-[var(--border-subtle)] min-h-[260px] flex items-center justify-center p-6 overflow-auto ${
                showGrid ? 'vector-grid-bg' : 'bg-white'
              }`}
            >
              {compareSplit ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-center">
                  <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col items-center">
                    <span className="text-[11px] font-mono text-slate-500 mb-2">
                      ORIGINAL RASTER CROP
                    </span>
                    <img
                      src={selectedIcon.croppedPreviewUrl}
                      alt="Original Crop"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col items-center">
                    <span className="text-[11px] font-mono text-indigo-600 mb-2">
                      CONVERTED EDITABLE SVG
                    </span>
                    <div
                      className="w-36 h-36 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: selectedIcon.svgContent }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="bg-white p-6 rounded-xl shadow-md border border-slate-200 flex items-center justify-center transition-transform"
                  style={{
                    width: `${(180 * zoomLevel) / 100}px`,
                    height: `${(180 * zoomLevel) / 100}px`,
                  }}
                >
                  {selectedIcon.svgContent ? (
                    <div
                      className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: selectedIcon.svgContent }}
                    />
                  ) : (
                    <img
                      src={selectedIcon.croppedPreviewUrl}
                      alt={selectedIcon.name}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              SVG QUALITY VALIDATION
            </div>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Valid XML Structure', ok: selectedIcon.validation.validXml },
                { label: 'ViewBox Present (0 0 120 120)', ok: selectedIcon.validation.hasViewBox },
                { label: 'Closed Vector Paths', ok: selectedIcon.validation.closedPaths },
                { label: 'Zero Raster Image Tags', ok: selectedIcon.validation.noRasterTag },
                { label: 'Transparent Isolation', ok: selectedIcon.validation.transparentBg },
              ].map((chk) => (
                <div key={chk.label} className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{chk.label}</span>
                  {chk.ok ? (
                    <span className="text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                    </span>
                  ) : (
                    <span className="text-amber-400 font-mono flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> CHECK
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
