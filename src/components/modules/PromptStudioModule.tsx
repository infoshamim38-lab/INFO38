import React, { useRef, useState } from 'react';
import { Sparkles, Copy, Check, Save, Download, Upload, Send } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { GeminiService, PromptStudioResult } from '../../core/gemini/GeminiService';
import { downloadTextFile } from '../../core/export/ExportEngine';

const CATEGORIES = [
  'Technology & UI',
  'Fintech & Banking',
  'E-Commerce & Retail',
  'Healthcare & Medical',
  'Cybersecurity & Cloud',
  'Logistics & Mobility',
  'Creative & Design Tools',
  'Smart Home & IoT',
];

const STYLES = [
  'Clean Minimal Vector',
  'Geometric Solid Silhouette',
  'Precision Technical Line',
  'Isometric Flat Vector',
  'Modern App System Icons',
];

const VARIANTS = [
  'VARIANT 01 - FULL BLACK SOLID',
  'VARIANT 02 - DOUBLE OUTLINE',
  'VARIANT 03 - SINGLE OUTLINE',
];

export const PromptStudioModule: React.FC = () => {
  const { geminiModel, addSavedPrompt, addFlowTask, setActiveNav, flowTargetUrl } = useStudio();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [textInput, setTextInput] = useState<string>(
    'Modern enterprise cloud security, biometric authentication, encrypted vault, API gateway, and zero-trust network icons'
  );
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [style, setStyle] = useState<string>(STYLES[0]);
  const [variant, setVariant] = useState<string>(VARIANTS[0]);
  const [iconCount, setIconCount] = useState<number>(25);

  const [refImageBase64, setRefImageBase64] = useState<string | undefined>(undefined);
  const [refImageMime, setRefImageMime] = useState<string>('image/png');
  const [refImageName, setRefImageName] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [studioResult, setStudioResult] = useState<PromptStudioResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const handleFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setRefImageBase64(reader.result as string);
      setRefImageMime(file.type || 'image/png');
      setRefImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await GeminiService.generatePrompt({
        textInput,
        referenceImageBase64: refImageBase64,
        referenceMimeType: refImageMime,
        category,
        style,
        variant,
        iconCount,
        model: geminiModel,
      });
      setStudioResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Prompt Studio specification.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!studioResult) return;
    navigator.clipboard.writeText(studioResult.masterSheetPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSave = () => {
    if (!studioResult) return;
    addSavedPrompt({
      id: `studio-${Date.now()}`,
      title: studioResult.title || `${category} (${iconCount} Icons)`,
      mode: 'Prompt Studio',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      structured: {
        subject: `${iconCount} Icons in ${category}`,
        composition: `Clean ${Math.ceil(Math.sqrt(iconCount))}x${Math.ceil(Math.sqrt(iconCount))} isolated icon sheet grid`,
        style,
        color: 'Pure Black (#000000) on Pure White (#FFFFFF)',
        lighting: 'Flat 2D vector, zero shadows',
        background: 'Pure White (#FFFFFF) isolated background',
        details: studioResult.technicalConstraints,
        quality: 'Production SVG vector ready, zero text or labels',
        finalPrompt: studioResult.masterSheetPrompt,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleExport = () => {
    if (!studioResult) return;
    const content = `TITLE: ${studioResult.title}\nCATEGORY: ${category}\nSTYLE: ${style}\nVARIANT: ${variant}\nICON COUNT: ${iconCount}\n\nMASTER SHEET PROMPT:\n${studioResult.masterSheetPrompt}\n\nTECHNICAL CONSTRAINTS:\n${studioResult.technicalConstraints}\n\nINDIVIDUAL ICON SUBJECTS (${studioResult.individualIconList.length}):\n${studioResult.individualIconList.map((item, i) => `${String(i + 1).padStart(2, '0')}. ${item}`).join('\n')}`;
    downloadTextFile(`prompt-studio-${Date.now()}.txt`, content);
  };

  const handleSendToFlow = () => {
    if (!studioResult) return;
    addFlowTask(studioResult.masterSheetPrompt, category);
    setActiveNav('flow-automation');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          AI PROMPT STUDIO
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Generate multi-icon sheet prompts and subject matrices tailored for clean vector extraction and zero-label icon generation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Configuration Workspace (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Text Input / Concept Description
            </label>
            <textarea
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Describe the icon set theme, objects, or visual direction..."
              className="w-full px-3 py-2 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Icon Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Number of Icons
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={iconCount}
                onChange={(e) => setIconCount(Math.max(1, Number(e.target.value) || 25))}
                className="w-full px-3 py-2 text-xs font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Style
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Variant (Strict No-Label / No-Text Rule)
            </label>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
            >
              {VARIANTS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Reference Image */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Reference Image (Optional)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{refImageName ? 'Change Reference' : 'Upload Reference'}</span>
              </button>
              {refImageName && (
                <span className="text-xs font-mono text-[var(--text-muted)] truncate">
                  {refImageName}
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChange(f);
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-2.5 px-4 rounded-md text-xs font-bold tracking-wide bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGenerating ? 'GENERATING STUDIO PROMPT...' : 'GENERATE PROMPT'}</span>
          </button>
        </div>

        {/* Right Output Workspace (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 min-h-[440px]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              PROMPT STUDIO SPECIFICATION
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!studioResult}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!studioResult}
                className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={!studioResult}
                className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              {studioResult ? (
                <a
                  href={`${flowTargetUrl}${flowTargetUrl.includes('?') ? '&' : '?'}ss_prompt=${encodeURIComponent(studioResult.masterSheetPrompt)}#ss_prompt=${encodeURIComponent(studioResult.masterSheetPrompt)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    void navigator.clipboard.writeText(studioResult.masterSheetPrompt).catch(() => {});
                    addFlowTask(studioResult.masterSheetPrompt, category, true, true);
                    setActiveNav('flow-automation');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/50 hover:bg-[var(--accent-soft)] flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Flow</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--border-subtle)] opacity-40 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Flow</span>
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded border border-rose-500/40 bg-rose-950/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          {studioResult ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded bg-[var(--bg-canvas)] border border-[var(--accent-primary)]/40 space-y-2">
                <div className="font-mono font-semibold text-[var(--accent-primary)]">
                  MASTER ICON SHEET PROMPT ({iconCount} ICONS · {variant}):
                </div>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed select-all">
                  {studioResult.masterSheetPrompt}
                </p>
              </div>

              <div className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
                <div className="font-mono font-semibold text-[var(--text-secondary)]">
                  VECTOR & ISOLATION CONSTRAINTS:
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {studioResult.technicalConstraints}
                </p>
              </div>

              <div className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
                <div className="font-mono font-semibold text-[var(--text-secondary)]">
                  INDIVIDUAL ICON SUBJECT MATRIX ({studioResult.individualIconList.length} ITEMS):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs text-[var(--text-secondary)]">
                  {studioResult.individualIconList.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] truncate"
                    >
                      {String(idx + 1).padStart(2, '0')}. {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-[var(--text-muted)] space-y-2">
              <Sparkles className="w-7 h-7 mx-auto opacity-60" />
              <div className="text-sm font-medium text-[var(--text-secondary)]">
                Configure Icon Category, Style, Variant, and Count
              </div>
              <p className="max-w-md mx-auto">
                Click <strong>GENERATE PROMPT</strong> to create a production icon sheet prompt with strict isolation rules (no text, no labels, no numbers, no watermarks).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
