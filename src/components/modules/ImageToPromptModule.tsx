import React, { useRef, useState } from 'react';
import {
  Upload,
  Copy,
  Check,
  RefreshCw,
  Save,
  Download,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { GeminiService } from '../../core/gemini/GeminiService';
import { ImagePromptMode, StructuredPromptResult } from '../../types/studio';
import { downloadTextFile } from '../../core/export/ExportEngine';

const MODES: ImagePromptMode[] = [
  'General Image Prompt',
  'AI Image Generation Prompt',
  'Vector Prompt',
  'Icon Prompt',
  'Thumbnail Prompt',
];

const PROMPT_STYLES = ['Professional', 'Technical Vector', 'Cinematic Studio', 'Minimalist Clean'];
const DETAIL_LEVELS = ['High', 'Ultra-Detailed', 'Balanced'];
const AVAILABLE_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

export const ImageToPromptModule: React.FC = () => {
  const {
    geminiModel,
    setGeminiModel,
    addSavedPrompt,
    sourceSheetImage,
    addFlowTask,
    setActiveNav,
    flowTargetUrl,
  } = useStudio();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedImage, setUploadedImage] = useState<string | null>(sourceSheetImage);
  const [uploadedMime, setUploadedMime] = useState<string>('image/png');
  const [uploadedName, setUploadedName] = useState<string>('reference-sheet.png');

  const [selectedMode, setSelectedMode] = useState<ImagePromptMode>('General Image Prompt');
  const [promptStyle, setPromptStyle] = useState<string>('Professional');
  const [detailLevel, setDetailLevel] = useState<string>('High');

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<StructuredPromptResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Unsupported image format. Please upload PNG, JPG, or WEBP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setUploadedMime(file.type || 'image/png');
      setUploadedName(file.name);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleGeneratePrompt = async () => {
    if (!uploadedImage) {
      setErrorMessage('Please upload or drop an image first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const analysis = await GeminiService.analyzeImage({
        imageBase64: uploadedImage,
        mimeType: uploadedMime,
        mode: selectedMode,
        promptStyle,
        detailLevel,
        model: geminiModel,
      });
      setResult(analysis);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gemini Generation Failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatStructuredText = (r: StructuredPromptResult): string => {
    return `SUBJECT:\n${r.subject}\n\nCOMPOSITION:\n${r.composition}\n\nSTYLE:\n${r.style}\n\nCOLOR:\n${r.color}\n\nLIGHTING:\n${r.lighting}\n\nBACKGROUND:\n${r.background}\n\nDETAILS:\n${r.details}\n\nQUALITY:\n${r.quality}\n\nFINAL PROMPT:\n${r.finalPrompt}`;
  };

  const handleCopyPrompt = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSavePrompt = () => {
    if (!result) return;
    addSavedPrompt({
      id: `prompt-${Date.now()}`,
      title: `${selectedMode} — ${uploadedName}`,
      mode: selectedMode,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      sourceThumbnail: uploadedImage || undefined,
      structured: result,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleExportTxt = () => {
    if (!result) return;
    const text = formatStructuredText(result);
    downloadTextFile(`ss-smart-studio-prompt-${Date.now()}.txt`, text);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            IMAGE → PROMPT
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Upload an image for real-time Gemini Vision analysis across subject, composition, style, color, lighting, material, and camera angle.
          </p>
        </div>

        {/* 5 Useful Modes */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          {MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                selectedMode === mode
                  ? 'bg-[var(--accent-primary)] text-slate-950 font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {mode.replace(' Prompt', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Desktop Layout: SOURCE IMAGE | GENERATED PROMPT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upload & Reference Image + Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                SOURCE IMAGE
              </span>
              {uploadedName && (
                <span className="text-xs font-mono text-[var(--text-muted)] truncate max-w-[180px]">
                  {uploadedName}
                </span>
              )}
            </div>

            {/* Drag & Drop Zone with persistent reference image preview */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-primary)] rounded-lg p-4 text-center transition-colors bg-[var(--bg-canvas)]"
            >
              {uploadedImage ? (
                <div className="space-y-3">
                  <div className="relative rounded overflow-hidden border border-[var(--border-subtle)] bg-white flex items-center justify-center max-h-64">
                    <img
                      src={uploadedImage}
                      alt="Uploaded Reference"
                      referrerPolicy="no-referrer"
                      className="max-h-60 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]"
                    >
                      Browse Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-3">
                  <Upload className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Drop Image Here
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    PNG / JPG / WEBP
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]"
                  >
                    Browse Image
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>

            {/* Configuration Controls */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Gemini Model
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Prompt Style
                  </label>
                  <select
                    value={promptStyle}
                    onChange={(e) => setPromptStyle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  >
                    {PROMPT_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Detail Level
                  </label>
                  <select
                    value={detailLevel}
                    onChange={(e) => setDetailLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  >
                    {DETAIL_LEVELS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeneratePrompt}
                disabled={isAnalyzing || !uploadedImage}
                className="w-full py-2.5 px-4 rounded-md text-xs font-bold tracking-wide bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ANALYZING VISUAL CONTENT...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>GENERATE PROMPT</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: GENERATED PROMPT (7 cols) */}
        <div className="lg:col-span-7">
          <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 min-h-[480px] flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  GENERATED PROMPT
                </span>
                <span className="ml-2 text-xs text-[var(--text-muted)]">
                  · {selectedMode}
                </span>
              </div>

              {/* Action Buttons: Copy Prompt, Regenerate, Save Prompt, Export TXT */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  disabled={!result}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  disabled={isAnalyzing || !uploadedImage}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePrompt}
                  disabled={!result}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savedNotice ? 'Saved' : 'Save Prompt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportTxt}
                  disabled={!result}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export TXT</span>
                </button>

                {result ? (
                  <a
                    href={`${flowTargetUrl}${flowTargetUrl.includes('?') ? '&' : '?'}ss_prompt=${encodeURIComponent(result.finalPrompt)}#ss_prompt=${encodeURIComponent(result.finalPrompt)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      void navigator.clipboard.writeText(result.finalPrompt).catch(() => {});
                      addFlowTask(result.finalPrompt, selectedMode, true, true);
                      setActiveNav('flow-automation');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/50 hover:bg-[var(--accent-soft)] flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span>Send to Flow</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/50 opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span>Send to Flow</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error State (Section 15 exact specification) */}
            {errorMessage && (
              <div className="p-4 rounded-lg border border-rose-500/40 bg-rose-950/20 text-xs space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Gemini Generation Failed</span>
                </div>
                <div className="text-[var(--text-secondary)]">{errorMessage}</div>
                <div className="text-[var(--text-muted)] space-y-1">
                  <div className="font-medium text-[var(--text-secondary)]">Possible reasons:</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Invalid API key</li>
                    <li>API quota</li>
                    <li>Model unavailable</li>
                    <li>Network problem</li>
                    <li>Unsupported image</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  className="px-3.5 py-1.5 rounded bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Structured Output Display */}
            {result ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'SUBJECT', value: result.subject },
                    { label: 'COMPOSITION', value: result.composition },
                    { label: 'STYLE', value: result.style },
                    { label: 'COLOR', value: result.color },
                    { label: 'LIGHTING', value: result.lighting },
                    { label: 'BACKGROUND', value: result.background },
                    { label: 'DETAILS', value: result.details },
                    { label: 'QUALITY', value: result.quality },
                  ].map((sec) => (
                    <div
                      key={sec.label}
                      className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1"
                    >
                      <div className="font-mono font-semibold text-[var(--accent-primary)]">
                        {sec.label}:
                      </div>
                      <div className="text-[var(--text-secondary)] leading-relaxed">
                        {sec.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded bg-[var(--bg-canvas)] border border-[var(--accent-primary)]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-[var(--accent-primary)]">
                      FINAL PROMPT:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="text-xs text-[var(--accent-primary)] hover:underline"
                    >
                      {copied ? '✓ Copied to clipboard' : 'Copy Final Prompt'}
                    </button>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed select-all">
                    {result.finalPrompt}
                  </p>
                </div>
              </div>
            ) : !errorMessage ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-xs text-[var(--text-muted)] space-y-2">
                <Sparkles className="w-7 h-7 text-[var(--text-muted)] opacity-60" />
                <div className="text-sm font-medium text-[var(--text-secondary)]">
                  Ready for Gemini Vision Analysis
                </div>
                <p className="max-w-md">
                  Click <strong>GENERATE PROMPT</strong> to analyze the source image and generate a structured professional prompt with SUBJECT, COMPOSITION, STYLE, COLOR, LIGHTING, BACKGROUND, DETAILS, QUALITY, and FINAL PROMPT.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
