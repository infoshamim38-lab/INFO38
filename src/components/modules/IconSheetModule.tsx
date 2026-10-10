import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Wrench,
  Sparkles,
  Maximize2,
  Shapes,
  Type,
  LayoutTemplate,
  Palette,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import {
  CanvasSizePreset,
  PresentationBackground,
  PresentationIconShape,
  PresentationSettings,
} from '../../types/studio';
import {
  downloadEpsFromSvg,
  downloadPngFromSvg,
  downloadSvgFile,
  exportFullStudioBundleZip,
} from '../../core/export/ExportEngine';

const BACKGROUNDS: PresentationBackground[] = [
  'White Grid',
  'Clean Light',
  'Dark Technical',
  'Transparent',
];

const CANVAS_SIZE_PRESETS: { label: CanvasSizePreset; w: number; h: number }[] = [
  { label: '2000 × 2000 px (Square)', w: 2000, h: 2000 },
  { label: '3000 × 2000 px (Landscape)', w: 3000, h: 2000 },
  { label: '4000 × 4000 px (4K Master)', w: 4000, h: 4000 },
  { label: '1920 × 1080 px (HD 16:9)', w: 1920, h: 1080 },
  { label: 'Custom Size', w: 2000, h: 2000 },
];

const ICON_SHAPES: PresentationIconShape[] = [
  'Rounded Square',
  'Circle',
  'Squircle',
  'Hexagon',
  'Diamond',
  'Shield',
  'Octagon',
  'Dashed Frame',
  'Soft Card Shadow',
  'None',
];

const GRID_PRESETS = [
  { label: '6 Icons (3×2)', count: 6, cols: 3, rows: 2 },
  { label: '9 Icons (3×3)', count: 9, cols: 3, rows: 3 },
  { label: '12 Icons (4×3)', count: 12, cols: 4, rows: 3 },
  { label: '16 Icons (4×4)', count: 16, cols: 4, rows: 4 },
  { label: '20 Icons (5×4)', count: 20, cols: 5, rows: 4 },
  { label: '25 Icons (5×5)', count: 25, cols: 5, rows: 5 },
  { label: '30 Icons (6×5)', count: 30, cols: 6, rows: 5 },
  { label: '36 Icons (6×6)', count: 36, cols: 6, rows: 6 },
];

const PRESENTATION_TEMPLATES: {
  name: string;
  desc: string;
  patch: Partial<PresentationSettings>;
}[] = [
  {
    name: 'Marketplace Pro Card',
    desc: 'Rounded square backing, clean header & #01 labels',
    patch: {
      backgroundStyle: 'White Grid',
      canvasBgColor: '#FFFFFF',
      iconShape: 'Rounded Square',
      shapeFillColor: '#F8FAFC',
      shapeStrokeColor: '#E2E8F0',
      shapeStrokeWidth: 2,
      showHeader: true,
      showFooter: true,
      showIconLabels: true,
      titleColor: '#0F172A',
      subtitleColor: '#64748B',
      labelColor: '#475569',
    },
  },
  {
    name: 'Circle Badge Studio',
    desc: 'Soft blue circle backing with crisp border',
    patch: {
      backgroundStyle: 'Clean Light',
      canvasBgColor: '#F8FAFC',
      iconShape: 'Circle',
      shapeFillColor: '#FFFFFF',
      shapeStrokeColor: '#CBD5E1',
      shapeStrokeWidth: 2.5,
      showHeader: true,
      showFooter: true,
      showIconLabels: true,
      titleColor: '#1E293B',
      subtitleColor: '#64748B',
      labelColor: '#334155',
    },
  },
  {
    name: 'Hexagon Cyber Dark',
    desc: 'Dark slate artboard with hexagon vector pods',
    patch: {
      backgroundStyle: 'Dark Technical',
      canvasBgColor: '#0F172A',
      iconShape: 'Hexagon',
      shapeFillColor: '#1E293B',
      shapeStrokeColor: '#38BDF8',
      shapeStrokeWidth: 2,
      showHeader: true,
      showFooter: true,
      showIconLabels: true,
      titleColor: '#F8FAFC',
      subtitleColor: '#94A3B8',
      labelColor: '#38BDF8',
    },
  },
  {
    name: 'Shield Security Pack',
    desc: 'Shield container frames for cybersecurity/tech icons',
    patch: {
      backgroundStyle: 'White Grid',
      canvasBgColor: '#FFFFFF',
      iconShape: 'Shield',
      shapeFillColor: '#EEF2FF',
      shapeStrokeColor: '#6366F1',
      shapeStrokeWidth: 2,
      showHeader: true,
      showFooter: true,
      showIconLabels: true,
      titleColor: '#1E1B4B',
      subtitleColor: '#4F46E5',
      labelColor: '#4338CA',
    },
  },
  {
    name: 'Minimalist Pure Vector',
    desc: 'No backing shapes — pure isolated vector icons',
    patch: {
      backgroundStyle: 'Clean Light',
      canvasBgColor: '#FFFFFF',
      iconShape: 'None',
      shapeStrokeWidth: 0,
      showHeader: true,
      showFooter: true,
      showIconLabels: false,
      titleColor: '#0F172A',
      subtitleColor: '#64748B',
    },
  },
];

export const IconSheetModule: React.FC = () => {
  const {
    extractedIcons,
    presentationSettings,
    setPresentationSettings,
    presentations,
    selectedPresentationIndex,
    setSelectedPresentationIndex,
    regeneratePresentations,
    autoFixPresentations,
  } = useStudio();

  const [activeBuilderTab, setActiveBuilderTab] = useState<'size' | 'shape' | 'text'>('size');
  const [exportingBundle, setExportingBundle] = useState(false);

  const activePresentation =
    presentations[selectedPresentationIndex] || presentations[0] || null;

  const updateSettings = (patch: Partial<PresentationSettings>) => {
    setPresentationSettings((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });
  };

  const handleSelectGridPreset = (preset: { count: number; cols: number; rows: number }) => {
    updateSettings({
      iconsPerSheet: preset.count,
      columns: preset.cols,
      rows: preset.rows,
    });
  };

  const handleSelectSizePreset = (label: CanvasSizePreset) => {
    const found = CANVAS_SIZE_PRESETS.find((p) => p.label === label);
    if (found && label !== 'Custom Size') {
      updateSettings({
        canvasSizePreset: label,
        customWidth: found.w,
        customHeight: found.h,
      });
    } else {
      updateSettings({ canvasSizePreset: label });
    }
  };

  const handleExportAllZip = async () => {
    if (presentations.length === 0) return;
    setExportingBundle(true);
    try {
      await exportFullStudioBundleZip(extractedIcons, presentations);
    } finally {
      setExportingBundle(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            ICON SET PRESENTATION BUILDER (SIZE · SHAPE · TEXT)
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Design your custom Icon Set Presentation with different Sizes, Backing Shapes, Colors, and Header/Footer Texts. Automatically populates whenever you click <strong>Icon Sheet</strong>!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => regeneratePresentations()}
            className="px-3.5 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rebuild Presentation</span>
          </button>

          <button
            type="button"
            onClick={autoFixPresentations}
            className="px-3.5 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 hover:bg-[var(--accent-soft)] flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Auto-Center & Balance</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportAllZip()}
            disabled={presentations.length === 0 || exportingBundle}
            className="px-4 py-2 text-xs font-bold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {exportingBundle ? 'Packaging ZIP...' : 'Export Presentation + All Vectors (.ZIP)'}
            </span>
          </button>
        </div>
      </div>

      {/* 1-Click Ready-Made Presentation Templates */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <LayoutTemplate className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            1-CLICK ICON SET PRESENTATION TEMPLATES
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            Saved automatically as your default Icon Sheet presentation style
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {PRESENTATION_TEMPLATES.map((tpl) => {
            const isCurrent =
              presentationSettings.iconShape === tpl.patch.iconShape &&
              presentationSettings.backgroundStyle === tpl.patch.backgroundStyle;
            return (
              <button
                key={tpl.name}
                type="button"
                onClick={() => updateSettings(tpl.patch)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isCurrent
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--accent-primary)]/50'
                }`}
              >
                <div className="text-xs font-bold text-[var(--text-primary)]">{tpl.name}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                  {tpl.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Presentation Designer Controls (Size | Shape | Text) (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            {/* 3 Designer Tabs: SIZE | SHAPE | TEXT */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveBuilderTab('size')}
                className={`py-2 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  activeBuilderTab === 'size'
                    ? 'bg-[var(--accent-primary)] text-slate-950 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>1. SIZE & GRID</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBuilderTab('shape')}
                className={`py-2 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  activeBuilderTab === 'shape'
                    ? 'bg-[var(--accent-primary)] text-slate-950 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Shapes className="w-3.5 h-3.5" />
                <span>2. SHAPE & COLOR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBuilderTab('text')}
                className={`py-2 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  activeBuilderTab === 'text'
                    ? 'bg-[var(--accent-primary)] text-slate-950 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>3. TEXT & TITLE</span>
              </button>
            </div>

            {/* TAB 1: SIZE & GRID */}
            {activeBuilderTab === 'size' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1.5">
                    Artboard / Presentation Size Preset
                  </label>
                  <select
                    value={presentationSettings.canvasSizePreset}
                    onChange={(e) =>
                      handleSelectSizePreset(e.target.value as CanvasSizePreset)
                    }
                    className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono"
                  >
                    {CANVAS_SIZE_PRESETS.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Width & Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      min={600}
                      max={8000}
                      step={100}
                      value={presentationSettings.customWidth}
                      onChange={(e) =>
                        updateSettings({
                          canvasSizePreset: 'Custom Size',
                          customWidth: Number(e.target.value) || 2000,
                        })
                      }
                      className="w-full px-3 py-1.5 font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      min={600}
                      max={8000}
                      step={100}
                      value={presentationSettings.customHeight}
                      onChange={(e) =>
                        updateSettings({
                          canvasSizePreset: 'Custom Size',
                          customHeight: Number(e.target.value) || 2000,
                        })
                      }
                      className="w-full px-3 py-1.5 font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                {/* Grid Layout Presets (6, 9, 12, 16, 20, 25, 30, 36) */}
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1.5">
                    Icons Per Sheet & Grid Layout
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {GRID_PRESETS.map((g) => {
                      const active =
                        presentationSettings.columns === g.cols &&
                        presentationSettings.rows === g.rows;
                      return (
                        <button
                          key={g.label}
                          type="button"
                          onClick={() => handleSelectGridPreset(g)}
                          className={`px-2.5 py-1.5 rounded font-mono text-left border transition-colors ${
                            active
                              ? 'bg-[var(--accent-primary)] text-slate-950 font-bold border-[var(--accent-primary)]'
                              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Columns & Rows */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      Columns ({presentationSettings.columns})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={presentationSettings.columns}
                      onChange={(e) => {
                        const cols = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                        updateSettings({
                          columns: cols,
                          iconsPerSheet: cols * presentationSettings.rows,
                        });
                      }}
                      className="w-full px-3 py-1.5 font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      Rows ({presentationSettings.rows})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={presentationSettings.rows}
                      onChange={(e) => {
                        const rows = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                        updateSettings({
                          rows,
                          iconsPerSheet: presentationSettings.columns * rows,
                        });
                      }}
                      className="w-full px-3 py-1.5 font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                {/* Sliders: Icon Scale, Outer Padding, Cell Spacing */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[var(--text-secondary)]">Icon Size in Cell</span>
                      <span className="font-mono font-bold text-[var(--accent-primary)]">
                        {presentationSettings.iconSizePercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={92}
                      value={presentationSettings.iconSizePercent}
                      onChange={(e) =>
                        updateSettings({ iconSizePercent: Number(e.target.value) })
                      }
                      className="w-full accent-[var(--accent-primary)]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[var(--text-secondary)]">Outer Margin Padding</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {presentationSettings.padding}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={120}
                      value={presentationSettings.padding}
                      onChange={(e) => updateSettings({ padding: Number(e.target.value) })}
                      className="w-full accent-[var(--accent-primary)]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[var(--text-secondary)]">Grid Spacing Gap</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {presentationSettings.spacing}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={64}
                      value={presentationSettings.spacing}
                      onChange={(e) => updateSettings({ spacing: Number(e.target.value) })}
                      className="w-full accent-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SHAPE & COLORS */}
            {activeBuilderTab === 'shape' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1.5">
                    Icon Backing Container Shape
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ICON_SHAPES.map((shape) => {
                      const active = (presentationSettings.iconShape || 'Rounded Square') === shape;
                      return (
                        <button
                          key={shape}
                          type="button"
                          onClick={() => updateSettings({ iconShape: shape })}
                          className={`px-2.5 py-2 rounded text-left font-medium border transition-colors ${
                            active
                              ? 'bg-[var(--accent-primary)] text-slate-950 font-bold border-[var(--accent-primary)]'
                              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {shape}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shape Fill & Stroke Color Pickers */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      Shape Fill Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={presentationSettings.shapeFillColor || '#F8FAFC'}
                        onChange={(e) => updateSettings({ shapeFillColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-[var(--border-subtle)] bg-transparent"
                      />
                      <input
                        type="text"
                        value={presentationSettings.shapeFillColor || '#F8FAFC'}
                        onChange={(e) => updateSettings({ shapeFillColor: e.target.value })}
                        className="w-full px-2 py-1.5 font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      Shape Border Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={presentationSettings.shapeStrokeColor || '#E2E8F0'}
                        onChange={(e) => updateSettings({ shapeStrokeColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-[var(--border-subtle)] bg-transparent"
                      />
                      <input
                        type="text"
                        value={presentationSettings.shapeStrokeColor || '#E2E8F0'}
                        onChange={(e) => updateSettings({ shapeStrokeColor: e.target.value })}
                        className="w-full px-2 py-1.5 font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Shape Border Width */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-secondary)]">Shape Border Thickness</span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {presentationSettings.shapeStrokeWidth ?? 2}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={presentationSettings.shapeStrokeWidth ?? 2}
                    onChange={(e) =>
                      updateSettings({ shapeStrokeWidth: Number(e.target.value) })
                    }
                    className="w-full accent-[var(--accent-primary)]"
                  />
                </div>

                {/* Canvas Background Preset & Custom Color */}
                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1.5">
                      Presentation Canvas Background
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {BACKGROUNDS.map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => updateSettings({ backgroundStyle: bg })}
                          className={`px-2.5 py-1.5 rounded text-xs font-medium border ${
                            presentationSettings.backgroundStyle === bg
                              ? 'bg-[var(--accent-primary)] text-slate-950 font-semibold border-[var(--accent-primary)]'
                              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      Custom Canvas Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={presentationSettings.canvasBgColor || '#FFFFFF'}
                        onChange={(e) => updateSettings({ canvasBgColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-[var(--border-subtle)] bg-transparent"
                      />
                      <input
                        type="text"
                        value={presentationSettings.canvasBgColor || '#FFFFFF'}
                        onChange={(e) => updateSettings({ canvasBgColor: e.target.value })}
                        className="w-full px-2.5 py-1.5 font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TEXT, HEADER & LABELS */}
            {activeBuilderTab === 'text' && (
              <div className="space-y-3.5 text-xs">
                <div className="flex flex-wrap items-center gap-4 pb-2 border-b border-[var(--border-subtle)]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={presentationSettings.showHeader !== false}
                      onChange={(e) => updateSettings({ showHeader: e.target.checked })}
                      className="rounded accent-[var(--accent-primary)]"
                    />
                    <span className="font-semibold text-[var(--text-primary)]">Show Header</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={presentationSettings.showIconLabels !== false}
                      onChange={(e) => updateSettings({ showIconLabels: e.target.checked })}
                      className="rounded accent-[var(--accent-primary)]"
                    />
                    <span className="font-semibold text-[var(--text-primary)]">
                      Show Icon Labels (#01)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={presentationSettings.showFooter !== false}
                      onChange={(e) => updateSettings({ showFooter: e.target.checked })}
                      className="rounded accent-[var(--accent-primary)]"
                    />
                    <span className="font-semibold text-[var(--text-primary)]">Show Footer</span>
                  </label>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Main Presentation Title
                  </label>
                  <input
                    type="text"
                    value={presentationSettings.headerTitle ?? presentationSettings.title}
                    onChange={(e) =>
                      updateSettings({
                        headerTitle: e.target.value,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g. CYBERSECURITY & TECH ICON PACK"
                    className="w-full px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Presentation Subtitle / Description
                  </label>
                  <input
                    type="text"
                    value={presentationSettings.headerSubtitle || ''}
                    onChange={(e) => updateSettings({ headerSubtitle: e.target.value })}
                    placeholder="e.g. 100% Editable Vector SVG Paths · Scalable Presentation"
                    className="w-full px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Top-Right Badge Text
                    </label>
                    <input
                      type="text"
                      value={presentationSettings.badgeText || ''}
                      onChange={(e) => updateSettings({ badgeText: e.target.value })}
                      placeholder="e.g. PRO VECTOR SET"
                      className="w-full px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Footer Signature Text
                    </label>
                    <input
                      type="text"
                      value={presentationSettings.footerText || ''}
                      onChange={(e) => updateSettings({ footerText: e.target.value })}
                      placeholder="e.g. SS SMART STUDIO · Editable SVG"
                      className="w-full px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                {/* Typography Color Controls */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                      Title Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={presentationSettings.titleColor || '#0F172A'}
                        onChange={(e) => updateSettings({ titleColor: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border border-[var(--border-subtle)]"
                      />
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {presentationSettings.titleColor || '#0F172A'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                      Subtitle Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={presentationSettings.subtitleColor || '#64748B'}
                        onChange={(e) => updateSettings({ subtitleColor: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border border-[var(--border-subtle)]"
                      />
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {presentationSettings.subtitleColor || '#64748B'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                      Label (#01) Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={presentationSettings.labelColor || '#475569'}
                        onChange={(e) => updateSettings({ labelColor: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border border-[var(--border-subtle)]"
                      />
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {presentationSettings.labelColor || '#475569'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Current Presentation Sheet Formats */}
          {activePresentation && (
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
              <div className="text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
                DOWNLOAD ACTIVE ICON SET PRESENTATION
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadSvgFile(
                      `icon-set-presentation-${activePresentation.index}.svg`,
                      activePresentation.svgSheetContent
                    )
                  }
                  className="py-2 px-3 rounded text-xs font-bold bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>SVG Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void downloadPngFromSvg(
                      `icon-set-presentation-${activePresentation.index}.png`,
                      activePresentation.svgSheetContent,
                      presentationSettings.customWidth || 2000,
                      presentationSettings.customHeight || 2000
                    )
                  }
                  className="py-2 px-3 rounded text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG ({presentationSettings.customWidth}px)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadEpsFromSvg(
                      `icon-set-presentation-${activePresentation.index}.eps`,
                      activePresentation.svgSheetContent
                    )
                  }
                  className="py-2 px-3 rounded text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EPS Sheet</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Icon Set Presentation Preview Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  LIVE ICON SET PRESENTATION CANVAS
                </span>
                <span className="ml-2 text-xs font-mono text-[var(--text-muted)]">
                  · {presentationSettings.customWidth}×{presentationSettings.customHeight}px · Shape:{' '}
                  {presentationSettings.iconShape || 'Rounded Square'} · Grid:{' '}
                  {presentationSettings.columns}×{presentationSettings.rows}
                </span>
              </div>

              {/* Multi-Sheet Selector if more icons than 1 sheet */}
              {presentations.length > 1 && (
                <div className="flex items-center gap-1">
                  {presentations.map((sheet, idx) => (
                    <button
                      key={sheet.id}
                      type="button"
                      onClick={() => setSelectedPresentationIndex(idx)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold ${
                        selectedPresentationIndex === idx
                          ? 'bg-[var(--accent-primary)] text-slate-950'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      Sheet #{sheet.index} ({sheet.icons.length})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rendered SVG Presentation Artboard */}
            {activePresentation ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-slate-950/40 p-4 flex items-center justify-center overflow-auto">
                <div
                  className="w-full max-w-[680px] rounded-lg shadow-xl overflow-hidden border border-slate-300/30 [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
                  dangerouslySetInnerHTML={{ __html: activePresentation.svgSheetContent }}
                />
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-[var(--text-muted)]">
                No vector icons available yet. Upload icons in the Vector tab and click{' '}
                <strong>Icon Sheet</strong>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
