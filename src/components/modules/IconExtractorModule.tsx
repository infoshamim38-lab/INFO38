import React, { useRef, useState } from 'react';
import {
  Upload,
  CheckCircle2,
  Download,
  RefreshCw,
  Scissors,
  Wand2,
  LayoutGrid,
  ArrowUpDown,
  CircleDot,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import {
  downloadPngFromSvg,
  downloadSvgFile,
  exportAllVectorsZip,
} from '../../core/export/ExportEngine';
import { generateSample25IconSheetDataUrl } from '../../core/vector-engine/IconDetectionAndVectorEngine';

export const IconExtractorModule: React.FC = () => {
  const {
    sourceSheetImage,
    extractedIcons,
    batchProgress,
    uploadAndSplitIconsToSingle,
    convertSingleIconsOneByOne,
    swapSingleIconColors,
    sameSingleIconColors,
    regeneratePresentations,
    setActiveNav,
  } = useStudio();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendInputRef = useRef<HTMLInputElement>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

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

  const handleFilesUpload = async (fileList: FileList | File[], append = false) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const urls: string[] = [];
    for (const f of files) {
      try {
        urls.push(await readFileAsDataUrl(f));
      } catch {
        // ignore
      }
    }
    if (urls.length > 0) {
      await uploadAndSplitIconsToSingle(urls, append);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            ICON SET & SINGLE ICON SPLITTER
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Upload any number of Icon Sets or Single Icons — automatically separates every icon into individual Single Icons ready for 1-by-1 Vector & Icon Sheet presentation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Icon Set / Single</span>
          </button>

          <button
            type="button"
            onClick={() => appendInputRef.current?.click()}
            className="px-3 py-2 text-xs font-medium rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
          >
            + Add More Icons
          </button>

          <button
            type="button"
            onClick={() => void convertSingleIconsOneByOne()}
            disabled={extractedIcons.length === 0 || batchProgress.active}
            className="px-4 py-2 text-xs font-bold rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Wand2 className={`w-3.5 h-3.5 ${batchProgress.active ? 'animate-spin' : ''}`} />
            <span>
              {batchProgress.active
                ? `Converting 1-by-1 (${batchProgress.completed}/${batchProgress.total})...`
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

      {/* Separated Single Icons Grid */}
      <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--text-primary)]">
            SEPARATED SINGLE ICONS ({extractedIcons.length})
          </span>
          <button
            type="button"
            onClick={() => void exportAllVectorsZip(extractedIcons)}
            className="px-3 py-1.5 rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All (.ZIP)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {extractedIcons.map((icon) => {
            const isSelected = selectedIcon?.id === icon.id;
            const hasSvg = Boolean(icon.svgContent && icon.isVectorized !== false);
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
                    #{icon.index} {hasSvg ? 'Vector' : 'Single'}
                  </span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => swapSingleIconColors(icon.id)}
                      disabled={!hasSvg}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 flex items-center gap-1"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Swap</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => sameSingleIconColors(icon.id)}
                      disabled={!hasSvg}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1 disabled:opacity-40 ${
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
                  {hasSvg ? (
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

                <div
                  className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>
                    {icon.bounds.width}×{icon.bounds.height}px
                  </span>
                  {hasSvg && (
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
