import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Copy,
  Check,
  RefreshCw,
  Save,
  Download,
  AlertTriangle,
  Sparkles,
  Play,
  Pause,
  Trash2,
  Send,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { GeminiService } from '../../core/gemini/GeminiService';
import { BatchPromptItem, ImagePromptMode } from '../../types/studio';
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
    flowTargetUrl,
    flowOptions,
    extensionConnected,
  } = useStudio();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch items (supports 1 to 1,000+ images uploaded at once)
  const [batchItems, setBatchItems] = useState<BatchPromptItem[]>(() =>
    sourceSheetImage
      ? [
          {
            id: 'img-initial-1',
            fileName: 'reference-sheet.png',
            mimeType: 'image/png',
            dataUrl: sourceSheetImage,
            prompt: '',
            status: 'Idle',
          },
        ]
      : []
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    sourceSheetImage ? 'img-initial-1' : null
  );

  const [selectedMode, setSelectedMode] = useState<ImagePromptMode>('General Image Prompt');
  const [promptStyle, setPromptStyle] = useState<string>('Professional');
  const [detailLevel, setDetailLevel] = useState<string>('High');

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [isAutoFlowRunning, setIsAutoFlowRunning] = useState<boolean>(false);
  const [batchPaused, setBatchPaused] = useState<boolean>(false);
  const batchPausedRef = useRef<boolean>(false);
  const stopRequestedRef = useRef<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoticeId, setSavedNoticeId] = useState<string | null>(null);

  // Resolver ref for waiting until Chrome Extension finishes generating & downloading 1 image in Flow
  const flowCompletionResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'SS_SMART_FLOW_EXTENSION') return;

      if (data.type === 'FLOW_TASK_COMPLETED' || data.type === 'FLOW_GENERATED_IMAGE') {
        if (flowCompletionResolverRef.current) {
          const resolve = flowCompletionResolverRef.current;
          flowCompletionResolverRef.current = null;
          resolve();
        }
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleFilesUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/')).slice(0, 1000);
    if (files.length === 0) {
      setErrorMessage('Unsupported format. Please upload PNG, JPG, or WEBP images (up to 1,000 at once).');
      return;
    }

    setErrorMessage(null);
    const newItems: BatchPromptItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(f);
        newItems.push({
          id: `batch-img-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          fileName: f.name,
          mimeType: f.type || 'image/png',
          dataUrl,
          prompt: '',
          status: 'Idle',
        });
      } catch {
        // skip unreadable file
      }
    }

    if (newItems.length > 0) {
      setBatchItems((prev) => {
        const updated = [...prev, ...newItems].slice(0, 1000);
        return updated;
      });
      setSelectedItemId(newItems[0].id);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFilesUpload(e.dataTransfer.files);
    }
  };

  const selectedItem =
    batchItems.find((item) => item.id === selectedItemId) || batchItems[0] || null;

  // Analyze a single image and return ONLY the clean prompt string
  const generatePromptForSingleItem = async (item: BatchPromptItem): Promise<string> => {
    setBatchItems((prev) =>
      prev.map((x) =>
        x.id === item.id ? { ...x, status: 'Analyzing', error: undefined } : x
      )
    );

    try {
      const analysis = await GeminiService.analyzeImage({
        imageBase64: item.dataUrl,
        mimeType: item.mimeType,
        mode: selectedMode,
        promptStyle,
        detailLevel,
        model: geminiModel,
      });

      const cleanPrompt = (analysis.finalPrompt || '').trim();

      setBatchItems((prev) =>
        prev.map((x) =>
          x.id === item.id
            ? { ...x, prompt: cleanPrompt, status: 'Prompt Ready', error: undefined }
            : x
        )
      );

      return cleanPrompt;
    } catch (err: any) {
      const msg = err?.message || 'Gemini Generation Failed';
      setBatchItems((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, status: 'Failed', error: msg } : x
        )
      );
      throw err;
    }
  };

  const handleGenerateCurrentPrompt = async () => {
    if (!selectedItem) {
      setErrorMessage('Please upload at least 1 image first.');
      return;
    }
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      await generatePromptForSingleItem(selectedItem);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gemini Generation Failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Batch Generate Prompts for all uploaded images (1 to 1,000) without sending to Flow yet
  const handleBatchGenerateAllPrompts = async () => {
    if (batchItems.length === 0) return;
    setIsBatchRunning(true);
    stopRequestedRef.current = false;
    batchPausedRef.current = false;
    setBatchPaused(false);
    setErrorMessage(null);

    for (let i = 0; i < batchItems.length; i++) {
      if (stopRequestedRef.current) break;
      while (batchPausedRef.current && !stopRequestedRef.current) {
        await new Promise((r) => setTimeout(r, 300));
      }
      if (stopRequestedRef.current) break;

      const item = batchItems[i];
      setSelectedItemId(item.id);
      if (item.prompt && item.status !== 'Failed') continue;

      try {
        await generatePromptForSingleItem(item);
      } catch {
        // continue to next image in 1000-image batch
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    setIsBatchRunning(false);
  };

  // Wait for Flow extension to complete generating and downloading 1 image (or timeout after 50s)
  const waitForSingleFlowCompletion = (timeoutMs = 50000): Promise<void> => {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          flowCompletionResolverRef.current = null;
          resolve();
        }
      }, timeoutMs);

      flowCompletionResolverRef.current = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      };
    });
  };

  // SEQUENTIAL 1-BY-1 PIPELINE FOR UP TO 1,000 IMAGES:
  // Image #1 -> Generate Prompt -> Send to Flow -> Generate Image -> Download 1 File -> Next Image #2 ...
  const handleSequentialFlowAutoPipeline = async () => {
    if (batchItems.length === 0) {
      setErrorMessage('Please upload images first (1 to 1,000 images supported).');
      return;
    }

    setIsAutoFlowRunning(true);
    stopRequestedRef.current = false;
    batchPausedRef.current = false;
    setBatchPaused(false);
    setErrorMessage(null);

    for (let i = 0; i < batchItems.length; i++) {
      if (stopRequestedRef.current) break;
      while (batchPausedRef.current && !stopRequestedRef.current) {
        await new Promise((r) => setTimeout(r, 300));
      }
      if (stopRequestedRef.current) break;

      const currentItem = batchItems[i];
      setSelectedItemId(currentItem.id);

      let promptText = currentItem.prompt.trim();
      if (!promptText) {
        try {
          promptText = await generatePromptForSingleItem(currentItem);
        } catch {
          continue;
        }
      }

      if (!promptText || stopRequestedRef.current) continue;

      // Mark item as Generating in Flow
      setBatchItems((prev) =>
        prev.map((x) =>
          x.id === currentItem.id ? { ...x, status: 'Flow Generating' } : x
        )
      );

      // Dispatch to Chrome Extension & Flow
      const taskId = `flow-seq-${Date.now()}-${i}`;
      addFlowTask(promptText, `${selectedMode} (#${i + 1})`, false, true);

      window.postMessage(
        {
          source: 'SS_SMART_STUDIO_APP',
          type: 'DISPATCH_FLOW_TASK',
          targetUrl: flowTargetUrl,
          options: flowOptions,
          task: {
            id: taskId,
            prompt: promptText,
            category: selectedMode,
          },
        },
        '*'
      );

      // Wait until the Chrome Extension finishes generating & downloading this 1 image in Flow before starting the next image!
      await waitForSingleFlowCompletion(extensionConnected ? 52000 : 8000);

      // Mark item as Downloaded (1 image)
      setBatchItems((prev) =>
        prev.map((x) =>
          x.id === currentItem.id ? { ...x, status: 'Downloaded' } : x
        )
      );

      // Brief 1.5s breather between sequential Flow tasks
      await new Promise((r) => setTimeout(r, 1500));
    }

    setIsAutoFlowRunning(false);
  };

  const handleTogglePause = () => {
    const next = !batchPaused;
    batchPausedRef.current = next;
    setBatchPaused(next);
  };

  const handleStopBatch = () => {
    stopRequestedRef.current = true;
    batchPausedRef.current = false;
    setBatchPaused(false);
    setIsBatchRunning(false);
    setIsAutoFlowRunning(false);
    if (flowCompletionResolverRef.current) {
      flowCompletionResolverRef.current();
      flowCompletionResolverRef.current = null;
    }
  };

  const handleCopyPrompt = (id: string, promptText: string) => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSaveSinglePrompt = (item: BatchPromptItem) => {
    if (!item.prompt) return;
    addSavedPrompt({
      id: `prompt-${Date.now()}`,
      title: `${selectedMode} — ${item.fileName}`,
      mode: selectedMode,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      sourceThumbnail: item.dataUrl,
      structured: {
        subject: '',
        composition: '',
        style: promptStyle,
        color: '',
        lighting: '',
        background: '',
        details: '',
        quality: detailLevel,
        finalPrompt: item.prompt,
      },
    });
    setSavedNoticeId(item.id);
    setTimeout(() => setSavedNoticeId(null), 1800);
  };

  const handleExportAllPromptsTxt = () => {
    const readyItems = batchItems.filter((x) => x.prompt.trim().length > 0);
    if (readyItems.length === 0) return;

    // Export ONLY the clean prompts (no extra metadata blocks)
    const content = readyItems
      .map((item, idx) =>
        readyItems.length === 1
          ? item.prompt.trim()
          : `[#${idx + 1} - ${item.fileName}]\n${item.prompt.trim()}`
      )
      .join('\n\n');

    downloadTextFile(`ss-smart-studio-prompts-${readyItems.length}.txt`, content);
  };

  const handleRemoveItem = (id: string) => {
    setBatchItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (selectedItemId === id) {
        setSelectedItemId(next[0]?.id || null);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    handleStopBatch();
    setBatchItems([]);
    setSelectedItemId(null);
  };

  const completedPromptsCount = batchItems.filter((x) => x.prompt.trim().length > 0).length;
  const downloadedFlowCount = batchItems.filter((x) => x.status === 'Downloaded').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            IMAGE → PROMPT (1 TO 1,000 IMAGES SEQUENTIAL FLOW ENGINE)
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Upload up to 1,000 images at once · Outputs ONLY the clean prompt · Automatically generates & downloads 1 image at a time in Google Flow.
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

      {/* Batch Automation Master Toolbar (1 to 1,000 Images) */}
      <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="px-2.5 py-1 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono font-semibold text-[var(--text-primary)]">
            Uploaded Images: {batchItems.length} / 1000
          </span>
          <span className="px-2.5 py-1 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-[var(--accent-primary)]">
            Prompts Ready: {completedPromptsCount} / {batchItems.length}
          </span>
          <span className="px-2.5 py-1 rounded bg-emerald-950/30 border border-emerald-500/30 font-mono text-emerald-400">
            Flow Generated & Downloaded (1-by-1): {downloadedFlowCount} / {batchItems.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Images (Up to 1,000)</span>
          </button>

          <button
            type="button"
            onClick={() => void handleBatchGenerateAllPrompts()}
            disabled={batchItems.length === 0 || isBatchRunning || isAutoFlowRunning}
            className="px-3.5 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 hover:bg-[var(--accent-soft)] disabled:opacity-40 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate All Prompts ({batchItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSequentialFlowAutoPipeline()}
            disabled={batchItems.length === 0 || isAutoFlowRunning || isBatchRunning}
            className="px-4 py-2 text-xs font-bold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>1-by-1 Auto Prompt → Flow Generate & Download ({batchItems.length})</span>
          </button>

          {(isBatchRunning || isAutoFlowRunning) && (
            <>
              <button
                type="button"
                onClick={handleTogglePause}
                className="px-3 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 flex items-center gap-1"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{batchPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                type="button"
                onClick={handleStopBatch}
                className="px-3 py-2 text-xs font-semibold rounded bg-rose-500 text-white flex items-center gap-1"
              >
                <span>Stop</span>
              </button>
            </>
          )}

          {batchItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-2 text-xs font-medium rounded bg-[var(--bg-canvas)] text-rose-400 border border-rose-500/30 hover:bg-rose-950/30 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Desktop Layout: SOURCE IMAGES QUEUE | CLEAN PROMPT OUTPUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Multi-Image Upload + Queue List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                SOURCE IMAGE(S) — UP TO 1,000 AT ONCE
              </span>
              {selectedItem && (
                <span className="text-xs font-mono text-[var(--text-muted)] truncate max-w-[180px]">
                  {selectedItem.fileName}
                </span>
              )}
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-primary)] rounded-lg p-4 text-center transition-colors bg-[var(--bg-canvas)]"
            >
              {selectedItem ? (
                <div className="space-y-3">
                  <div className="relative rounded overflow-hidden border border-[var(--border-subtle)] bg-white flex items-center justify-center max-h-56">
                    <img
                      src={selectedItem.dataUrl}
                      alt={selectedItem.fileName}
                      referrerPolicy="no-referrer"
                      className="max-h-52 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]"
                    >
                      + Add More Images (Up to 1,000)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-3">
                  <Upload className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Drop 1 to 1,000 Images Here
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    PNG / JPG / WEBP · Multi-Select Supported
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]"
                  >
                    Browse Images
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    void handleFilesUpload(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </div>

            {/* Configuration Controls */}
            <div className="space-y-3 pt-1">
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
                onClick={() => void handleGenerateCurrentPrompt()}
                disabled={isAnalyzing || !selectedItem}
                className="w-full py-2.5 px-4 rounded-md text-xs font-bold tracking-wide bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>GENERATING CLEAN PROMPT...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>GENERATE PROMPT FOR SELECTED IMAGE</span>
                  </>
                )}
              </button>
            </div>

            {/* Uploaded Image Queue List */}
            {batchItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    IMAGE QUEUE ({batchItems.length})
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Click any image to view/edit prompt
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {batchItems.map((item, idx) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-2 rounded border flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs ${
                          isSelected
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-[11px] text-[var(--text-muted)] w-6 shrink-0">
                            #{idx + 1}
                          </span>
                          <img
                            src={item.dataUrl}
                            alt={item.fileName}
                            className="w-8 h-8 rounded object-cover bg-white border border-[var(--border-subtle)] shrink-0"
                          />
                          <div className="truncate">
                            <div className="font-medium text-[var(--text-primary)] truncate">
                              {item.fileName}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate">
                              {item.prompt ? item.prompt.slice(0, 42) + '...' : 'No prompt yet'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              item.status === 'Downloaded'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                : item.status === 'Prompt Ready'
                                ? 'bg-sky-950/60 text-sky-400 border border-sky-500/30'
                                : item.status === 'Analyzing' || item.status === 'Flow Generating'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                                : item.status === 'Failed'
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.status}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-rose-400"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: ONLY CLEAN PROMPT OUTPUT (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 min-h-[480px] flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  IMAGE PROMPT ONLY (CLEAN OUTPUT)
                </span>
                <span className="ml-2 text-xs text-[var(--text-muted)]">
                  · {selectedMode}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    selectedItem && handleCopyPrompt(selectedItem.id, selectedItem.prompt)
                  }
                  disabled={!selectedItem?.prompt}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {copiedId === selectedItem?.id ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === selectedItem?.id ? 'Copied' : 'Copy Prompt'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleGenerateCurrentPrompt()}
                  disabled={isAnalyzing || !selectedItem}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectedItem && handleSaveSinglePrompt(selectedItem)}
                  disabled={!selectedItem?.prompt}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savedNoticeId === selectedItem?.id ? 'Saved' : 'Save Prompt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAllPromptsTxt}
                  disabled={completedPromptsCount === 0}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export TXT ({completedPromptsCount})</span>
                </button>

                {selectedItem?.prompt ? (
                  <a
                    href={`${flowTargetUrl}${
                      flowTargetUrl.includes('?') ? '&' : '?'
                    }ss_prompt=${encodeURIComponent(
                      selectedItem.prompt
                    )}#ss_prompt=${encodeURIComponent(selectedItem.prompt)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      void navigator.clipboard.writeText(selectedItem.prompt).catch(() => {});
                      addFlowTask(selectedItem.prompt, selectedMode, true, true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/50 hover:bg-[var(--accent-soft)] flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Flow</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/50 opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Flow</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error State */}
            {errorMessage && (
              <div className="p-4 rounded-lg border border-rose-500/40 bg-rose-950/20 text-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Prompt Generation Notice</span>
                </div>
                <div className="text-[var(--text-secondary)]">{errorMessage}</div>
              </div>
            )}

            {/* ONLY THE PROMPT BOX — All extra metadata cards removed as requested */}
            {selectedItem && selectedItem.prompt ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="p-5 rounded-lg bg-[var(--bg-canvas)] border-2 border-[var(--accent-primary)]/50 space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">
                      PROMPT ({selectedItem.fileName}):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(selectedItem.id, selectedItem.prompt)}
                      className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                    >
                      {copiedId === selectedItem.id ? '✓ Copied to clipboard' : 'Copy Prompt'}
                    </button>
                  </div>

                  <textarea
                    value={selectedItem.prompt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBatchItems((prev) =>
                        prev.map((x) =>
                          x.id === selectedItem.id ? { ...x, prompt: val } : x
                        )
                      );
                    }}
                    rows={8}
                    className="w-full flex-1 p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>

                {/* All Ready Prompts Quick List when multiple images are uploaded */}
                {completedPromptsCount > 1 && (
                  <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">
                      ALL GENERATED PROMPTS ({completedPromptsCount})
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                      {batchItems
                        .filter((x) => x.prompt.trim().length > 0)
                        .map((item, i) => (
                          <div
                            key={item.id}
                            className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold text-[var(--accent-primary)]">
                                #{i + 1} · {item.fileName}
                              </span>
                              <div className="flex items-center gap-2">
                                {item.status === 'Downloaded' && (
                                  <span className="text-emerald-400 inline-flex items-center gap-1 font-mono text-[11px]">
                                    <CheckCircle2 className="w-3 h-3" /> Downloaded (1x)
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopyPrompt(item.id, item.prompt)}
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                  {copiedId === item.id ? '✓ Copied' : 'Copy'}
                                </button>
                              </div>
                            </div>
                            <p className="text-[var(--text-primary)] leading-relaxed select-all">
                              {item.prompt}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-xs text-[var(--text-muted)] space-y-3">
                <Sparkles className="w-8 h-8 text-[var(--accent-primary)] opacity-75" />
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Clean Prompt-Only Mode Ready (1 to 1,000 Images)
                </div>
                <p className="max-w-md text-[var(--text-secondary)]">
                  Upload 1 to 1,000 images on the left. Click <strong>GENERATE PROMPT</strong> for a single image, or click <strong>1-by-1 Auto Prompt → Flow Generate & Download</strong> to process every image sequentially and download 1 result image per prompt.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
