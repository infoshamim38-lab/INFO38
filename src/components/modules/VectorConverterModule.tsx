import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
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

const VARIANTS: IconVariant[] = [
  'COLOR VECTOR',
  'VARIANT 01',
  'VARIANT 02',
  'VARIANT 03',
];

export const VectorConverterModule: React.FC = () => {
  const {
    extractedIcons,
    activeVariant,
    setActiveVariant,
    batchProgress,
    convertSingleIconsOneByOne,
    swapSingleIconColors,
    sameSingleIconColors,
    regeneratePresentations,
    setActiveNav,
  } = useStudio();

  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

  const selectedIcon =
    extractedIcons.find((i) => i.id === selectedIconId) || extractedIcons[0] || null;

  const handleVariantChange = (variant: IconVariant) => {
    setActiveVariant(variant);
    void convertSingleIconsOneByOne(variant);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            1-BY-1 COLOR VECTOR CONVERTER
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Converts each separated Single Icon 1-by-1 into multi-color hollow-aware SVG paths with Swap & Same color controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            {VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => handleVariantChange(v)}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded transition-colors ${
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
            onClick={() => void convertSingleIconsOneByOne(activeVariant)}
            disabled={extractedIcons.length === 0 || batchProgress.active}
            className="px-4 py-2 text-xs font-bold rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Wand2 className={`w-3.5 h-3.5 ${batchProgress.active ? 'animate-spin' : ''}`} />
            <span>
              {batchProgress.active
                ? `Vectorizing ${batchProgress.completed}/${batchProgress.total}...`
                : `Vector (1-by-1 Convert All ${extractedIcons.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              regeneratePresentations();
              setActiveNav('icon-sheet');
            }}
            disabled={extractedIcons.length === 0}
            className="px-4 py-2 text-xs font-bold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Icon Sheet (Build Presentation)</span>
          </button>

          <button
            type="button"
            onClick={() => void exportAllVectorsZip(extractedIcons)}
            disabled={extractedIcons.length === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Screenshot #2 Style Vector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {extractedIcons.map((icon) => {
          const isSelected = selectedIcon?.id === icon.id;
          const isConverting = icon.status === 'Converting';
          return (
            <div
              key={icon.id}
              onClick={() => setSelectedIconId(icon.id)}
              className={`rounded-2xl bg-white text-slate-900 p-4 shadow-sm border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[240px] ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-600">
                  #{icon.index} {isConverting ? 'Converting...' : 'Vector'}
                </span>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => swapSingleIconColors(icon.id)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 flex items-center gap-1"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Swap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => sameSingleIconColors(icon.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1 ${
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

              <div className="my-2 flex-1 flex items-center justify-center p-4">
                {isConverting ? (
                  <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
                ) : (
                  <div
                    className="w-36 h-36 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: icon.svgContent }}
                  />
                )}
              </div>

              <div
                className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500"
                onClick={(e) => e.stopPropagation()}
              >
                <span>{icon.validation.pathCount} SVG Paths</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => downloadSvgFile(`${icon.name}.svg`, icon.svgContent)}
                    className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold"
                  >
                    SVG
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void downloadPngFromSvg(`${icon.name}.png`, icon.svgContent, 1024)
                    }
                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold"
                  >
                    PNG
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
