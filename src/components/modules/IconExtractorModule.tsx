import React from 'react';
import { CheckCircle2, Download, Trash2, Copy } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import {
  exportIndividualSvgsAsZip,
  exportSingleSvg,
} from '../../core/export/ExportEngine';

export const IconExtractorModule: React.FC = () => {
  const {
    extractedIcons,
    setExtractedIcons,
    activeVariant,
    setActiveVariant,
  } = useStudio();

  const handleDuplicateTo100 = () => {
    if (extractedIcons.length === 0) return;
    const targetCount = 100;
    const expanded = [];
    for (let i = 0; i < targetCount; i++) {
      const base = extractedIcons[i % extractedIcons.length];
      const num = String(i + 1).padStart(2, '0');
      expanded.push({
        ...base,
        id: `icon-100-${i}-${Date.now()}`,
        index: i + 1,
        name: `${num}.svg`,
      });
    }
    setExtractedIcons(expanded);
  };

  const handleResetTo25 = () => {
    if (extractedIcons.length <= 25) return;
    setExtractedIcons(extractedIcons.slice(0, 25));
  };

  const handleDeleteIcon = (id: string) => {
    setExtractedIcons((prev) =>
      prev
        .filter((ic) => ic.id !== id)
        .map((ic, idx) => ({
          ...ic,
          index: idx + 1,
          name: `${String(idx + 1).padStart(2, '0')}.svg`,
        }))
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            INDIVIDUAL ICON EXTRACTOR
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Pipeline: Detect → Bounding Box → Crop → Clean → Background Removal → Vectorize → Optimize → Validate → Export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDuplicateTo100}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Expand Batch to 100 Icons</span>
          </button>

          {extractedIcons.length > 25 && (
            <button
              type="button"
              onClick={handleResetTo25}
              className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
            >
              Reset to 25 Icons
            </button>
          )}

          <button
            type="button"
            onClick={() => exportIndividualSvgsAsZip(extractedIcons)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All ({extractedIcons.length} SVGs)</span>
          </button>
        </div>
      </div>

      {/* Variant Bar */}
      <div className="flex items-center justify-between p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span>Active Vector Variant:</span>
          <span className="font-mono font-semibold text-[var(--accent-primary)]">
            {activeVariant}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(['VARIANT 01', 'VARIANT 02', 'VARIANT 03'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveVariant(v)}
              className={`px-2.5 py-1 rounded font-medium ${
                activeVariant === v
                  ? 'bg-[var(--accent-primary)] text-slate-950 font-semibold'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Inspection Table */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
              <tr>
                <th className="py-2.5 px-4 font-medium">File</th>
                <th className="py-2.5 px-4 font-medium">Raster Crop</th>
                <th className="py-2.5 px-4 font-medium">Vector SVG</th>
                <th className="py-2.5 px-4 font-medium">Bounding Box</th>
                <th className="py-2.5 px-4 font-medium">Dimensions</th>
                <th className="py-2.5 px-4 font-medium">Validation</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-mono tabular-nums text-[var(--text-secondary)]">
              {extractedIcons.map((icon) => (
                <tr key={icon.id} className="hover:bg-[var(--bg-elevated)]/50">
                  <td className="py-2 px-4 font-semibold text-[var(--text-primary)]">
                    {icon.name}
                  </td>
                  <td className="py-2 px-4">
                    {icon.croppedDataUrl ? (
                      <img
                        src={icon.croppedDataUrl}
                        alt={icon.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded bg-white object-contain p-1 border border-slate-200"
                      />
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <div
                      className="w-9 h-9 rounded bg-white p-1 flex items-center justify-center border border-slate-200"
                      dangerouslySetInnerHTML={{ __html: icon.svgContent }}
                    />
                  </td>
                  <td className="py-2 px-4">
                    x:{icon.bbox.x}, y:{icon.bbox.y} ({icon.bbox.width}×{icon.bbox.height})
                  </td>
                  <td className="py-2 px-4">
                    {icon.originalWidth}×{icon.originalHeight}px (1:{icon.aspectRatio})
                  </td>
                  <td className="py-2 px-4 text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Clean SVG
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => exportSingleSvg(icon)}
                        className="px-2.5 py-1 rounded bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] font-sans"
                      >
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteIcon(icon.id)}
                        className="p-1 rounded bg-[var(--bg-canvas)] text-rose-400 border border-[var(--border-subtle)] hover:border-rose-400"
                        title="Remove Icon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
