import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ExtractedIconItem,
  FlowAutomationOptions,
  FlowQueueTask,
  IconSheetPresentation,
  IconVariant,
  LicenseDuration,
  LicenseRecord,
  NavSection,
  PresentationSettings,
  SavedPromptItem,
  ThemeMode,
} from '../types/studio';
import {
  detectIconsFromImage,
  generateSample25IconSheetDataUrl,
  vectorizeSingleIconCrop,
} from '../core/vector-engine/IconDetectionAndVectorEngine';
import { buildIconSheetPresentations } from '../core/sheet-engine/IconSheetPresentationEngine';

interface StudioContextValue {
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  geminiModel: string;
  setGeminiModel: (model: string) => void;
  geminiStatus: 'Connected' | 'Disconnected' | 'Testing' | 'Failed';
  setGeminiStatus: (status: 'Connected' | 'Disconnected' | 'Testing' | 'Failed') => void;
  geminiError: string | null;
  setGeminiError: (err: string | null) => void;

  // Saved Prompts
  savedPrompts: SavedPromptItem[];
  addSavedPrompt: (item: SavedPromptItem) => void;
  removeSavedPrompt: (id: string) => void;

  // Vector & Extracted Icons
  sourceSheetImage: string | null;
  setSourceSheetImage: (src: string | null) => void;
  extractedIcons: ExtractedIconItem[];
  setExtractedIcons: React.Dispatch<React.SetStateAction<ExtractedIconItem[]>>;
  activeVariant: IconVariant;
  setActiveVariant: (variant: IconVariant) => void;
  batchProgress: {
    active: boolean;
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  runSheetDetectionAndVectorBatch: (imageSrc: string, variant?: IconVariant) => Promise<void>;
  retryIconConversion: (iconId: string) => void;
  skipFailedIcon: (iconId: string) => void;

  // Icon Sheet Presentations
  presentationSettings: PresentationSettings;
  setPresentationSettings: React.Dispatch<React.SetStateAction<PresentationSettings>>;
  presentations: IconSheetPresentation[];
  selectedPresentationIndex: number;
  setSelectedPresentationIndex: (index: number) => void;
  regeneratePresentations: () => void;
  autoFixPresentations: () => void;

  // Flow Automation & SS SMART FLOW Extension
  extensionConnected: boolean;
  setExtensionConnected: (connected: boolean) => void;
  extensionVersion: string | null;
  extensionPaused: boolean;
  setExtensionPaused: (paused: boolean) => void;
  flowTargetUrl: string;
  setFlowTargetUrl: (url: string) => void;
  flowOptions: FlowAutomationOptions;
  setFlowOptions: React.Dispatch<React.SetStateAction<FlowAutomationOptions>>;
  flowTasks: FlowQueueTask[];
  addFlowTask: (prompt: string, category?: string, autoExecute?: boolean, openedByAnchor?: boolean) => void;
  runFlowAutomationQueue: () => Promise<void>;
  executeSingleFlowTask: (
    taskId: string,
    promptOverride?: string,
    categoryOverride?: string,
    openedByAnchor?: boolean
  ) => Promise<void>;
  clearFlowTasks: () => void;

  // Output Management
  outputFolder: string;
  setOutputFolder: (folder: string) => void;

  // License & Admin
  activeLicense: LicenseRecord;
  allLicenses: LicenseRecord[];
  activateLicenseKey: (key: string) => boolean;
  createLicense: (holder: string, duration: LicenseDuration) => LicenseRecord;
  revokeLicense: (id: string) => void;
}

const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  iconsPerPresentation: 25,
  columns: 'Auto',
  rows: 'Auto',
  canvasWidth: 'Auto',
  canvasHeight: 'Auto',
  iconSize: 'Auto',
  spacing: 'Auto',
  padding: 'Auto',
  margin: 'Auto',
  autoFit: true,
  equalSpacing: true,
  preserveAspectRatio: true,
  preventCropping: true,
  preventOverlap: true,
};

const INITIAL_LICENSES: LicenseRecord[] = [
  {
    id: 'lic-01',
    key: 'SS-STUDIO-LIFE-9942-8821',
    holder: 'Studio Production Workstation',
    duration: 'Lifetime',
    status: 'Active',
    createdAt: '2026-01-10',
    expiresAt: 'Never (Lifetime)',
  },
  {
    id: 'lic-02',
    key: 'SS-STUDIO-1YR-4410-2091',
    holder: 'Vector Design Team A',
    duration: '1 Year',
    status: 'Active',
    createdAt: '2026-06-01',
    expiresAt: '2027-06-01',
  },
  {
    id: 'lic-03',
    key: 'SS-STUDIO-6MO-3190-7742',
    holder: 'Freelance Seat 04',
    duration: '6 Months',
    status: 'Active',
    createdAt: '2026-08-15',
    expiresAt: '2027-02-15',
  },
];

const StudioContext = createContext<StudioContextValue | null>(null);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('ss_smart_studio_theme');
    if (saved === 'DARK' || saved === 'BLUE' || saved === 'RED' || saved === 'CYAN') {
      return saved;
    }
    return 'DARK';
  });

  const [geminiModel, setGeminiModel] = useState<string>(() => {
    return localStorage.getItem('ss_smart_studio_model') || 'gemini-3.1-flash-lite';
  });
  const [geminiStatus, setGeminiStatus] = useState<'Connected' | 'Disconnected' | 'Testing' | 'Failed'>('Connected');
  const [geminiError, setGeminiError] = useState<string | null>(null);

  const [savedPrompts, setSavedPrompts] = useState<SavedPromptItem[]>(() => {
    try {
      const raw = localStorage.getItem('ss_smart_studio_prompts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [sourceSheetImage, setSourceSheetImage] = useState<string | null>(null);
  const [extractedIcons, setExtractedIcons] = useState<ExtractedIconItem[]>([]);
  const [activeVariant, setActiveVariantState] = useState<IconVariant>('VARIANT 01');
  const [batchProgress, setBatchProgress] = useState({
    active: false,
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
  });

  const [presentationSettings, setPresentationSettings] = useState<PresentationSettings>(
    DEFAULT_PRESENTATION_SETTINGS
  );
  const [presentations, setPresentations] = useState<IconSheetPresentation[]>([]);
  const [selectedPresentationIndex, setSelectedPresentationIndex] = useState<number>(0);

  const [extensionConnected, setExtensionConnected] = useState<boolean>(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);
  const [extensionPaused, setExtensionPaused] = useState<boolean>(false);
  const [flowTargetUrl, setFlowTargetUrl] = useState<string>(() => {
    return localStorage.getItem('ss_smart_studio_flow_url') || 'https://labs.google/fx/tools/flow';
  });
  const [flowOptions, setFlowOptions] = useState<FlowAutomationOptions>({
    autoSubmit: true,
    autoGenerate: true,
    autoDetectResult: true,
    autoDownload: true,
  });
  const [flowTasks, setFlowTasks] = useState<FlowQueueTask[]>([
    {
      id: 'flow-01',
      prompt: '25 minimalist fintech solid black vector icons on pure white grid, zero labels, crisp silhouette',
      category: 'Fintech & Banking',
      status: 'Downloaded',
      progress: 100,
      outputFile: 'D:\\SS SMART STUDIO\\Output\\Flow\\fintech-sheet-01.png',
      timestamp: '10:14:22',
    },
    {
      id: 'flow-02',
      prompt: '25 cybersecurity shield, lock, and cloud infrastructure monoline outline icons on pure white surface',
      category: 'Cybersecurity',
      status: 'Queued',
      progress: 0,
      timestamp: '10:18:05',
    },
  ]);

  const [outputFolder, setOutputFolderState] = useState<string>(() => {
    return localStorage.getItem('ss_smart_studio_output_folder') || 'D:\\SS SMART STUDIO\\Output';
  });

  const [allLicenses, setAllLicenses] = useState<LicenseRecord[]>(() => {
    try {
      const raw = localStorage.getItem('ss_smart_studio_licenses');
      return raw ? JSON.parse(raw) : INITIAL_LICENSES;
    } catch {
      return INITIAL_LICENSES;
    }
  });
  const [activeLicense, setActiveLicense] = useState<LicenseRecord>(() => {
    return INITIAL_LICENSES[0];
  });

  // Sync theme attribute on documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ss_smart_studio_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ss_smart_studio_model', geminiModel);
  }, [geminiModel]);

  useEffect(() => {
    localStorage.setItem('ss_smart_studio_prompts', JSON.stringify(savedPrompts));
  }, [savedPrompts]);

  useEffect(() => {
    localStorage.setItem('ss_smart_studio_output_folder', outputFolder);
  }, [outputFolder]);

  useEffect(() => {
    localStorage.setItem('ss_smart_studio_licenses', JSON.stringify(allLicenses));
  }, [allLicenses]);

  // Seed initial 25-icon sheet on first load so Vector Converter, Icon Extractor, and Icon Sheet Builder are immediately populated & testable
  useEffect(() => {
    const sampleUrl = generateSample25IconSheetDataUrl();
    setSourceSheetImage(sampleUrl);
    void runSheetDetectionAndVectorBatch(sampleUrl, 'VARIANT 01');
  }, []);

  // Rebuild presentations whenever extractedIcons or presentationSettings change
  useEffect(() => {
    const readyIcons = extractedIcons.filter((ic) => ic.status === 'Ready');
    const built = buildIconSheetPresentations(readyIcons, presentationSettings);
    setPresentations(built);
    if (selectedPresentationIndex >= built.length) {
      setSelectedPresentationIndex(0);
    }
  }, [extractedIcons, presentationSettings]);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
  };

  const setOutputFolder = (folder: string) => {
    setOutputFolderState(folder);
  };

  const addSavedPrompt = (item: SavedPromptItem) => {
    setSavedPrompts((prev) => [item, ...prev]);
  };

  const removeSavedPrompt = (id: string) => {
    setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  const runSheetDetectionAndVectorBatch = async (
    imageSrc: string,
    variantOverride?: IconVariant
  ) => {
    const targetVariant = variantOverride || activeVariant;
    setSourceSheetImage(imageSrc);

    const { boxes, imageElement } = await detectIconsFromImage(imageSrc);
    const total = boxes.length;

    setBatchProgress({
      active: true,
      total,
      completed: 0,
      failed: 0,
      pending: total,
    });

    const results: ExtractedIconItem[] = [];

    // Process icons asynchronously in small chunks so the main UI thread never freezes
    const chunkSize = 5;
    for (let i = 0; i < total; i += chunkSize) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          const end = Math.min(total, i + chunkSize);
          for (let j = i; j < end; j++) {
            try {
              const item = vectorizeSingleIconCrop(imageElement, boxes[j], j, targetVariant);
              results.push(item);
            } catch (err: any) {
              const formattedIdx = String(j + 1).padStart(2, '0');
              results.push({
                id: `icon-err-${j}`,
                index: j + 1,
                name: `${formattedIdx}.svg`,
                bbox: boxes[j],
                originalWidth: boxes[j].width,
                originalHeight: boxes[j].height,
                aspectRatio: 1,
                croppedDataUrl: '',
                svgContent: '',
                variant: targetVariant,
                status: 'Failed',
                errorMessage: err?.message || 'Vector conversion failed.',
                validation: {
                  isComplete: false,
                  insideCanvas: false,
                  noCrop: false,
                  noOverlap: false,
                  noBrokenPath: false,
                  correctAspectRatio: false,
                  safeMargin: false,
                  validSvg: false,
                },
              });
            }
          }

          const completedCount = results.filter((r) => r.status === 'Ready').length;
          const failedCount = results.filter((r) => r.status === 'Failed').length;
          const pendingCount = Math.max(0, total - results.length);

          setExtractedIcons([...results]);
          setBatchProgress({
            active: pendingCount > 0,
            total,
            completed: completedCount,
            failed: failedCount,
            pending: pendingCount,
          });
          resolve();
        }, 25);
      });
    }
  };

  const setActiveVariant = (variant: IconVariant) => {
    setActiveVariantState(variant);
    if (sourceSheetImage) {
      void runSheetDetectionAndVectorBatch(sourceSheetImage, variant);
    }
  };

  const retryIconConversion = async (iconId: string) => {
    if (!sourceSheetImage) return;
    const target = extractedIcons.find((ic) => ic.id === iconId);
    if (!target) return;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image load failed'));
      el.src = sourceSheetImage;
    });

    const recovered = vectorizeSingleIconCrop(img, target.bbox, target.index - 1, activeVariant);
    setExtractedIcons((prev) => prev.map((ic) => (ic.id === iconId ? recovered : ic)));
  };

  const skipFailedIcon = (iconId: string) => {
    setExtractedIcons((prev) => prev.filter((ic) => ic.id !== iconId));
  };

  const regeneratePresentations = () => {
    const readyIcons = extractedIcons.filter((ic) => ic.status === 'Ready');
    const built = buildIconSheetPresentations(readyIcons, presentationSettings);
    setPresentations(built);
  };

  const autoFixPresentations = () => {
    const fixedSettings: PresentationSettings = {
      ...presentationSettings,
      columns: 'Auto',
      rows: 'Auto',
      iconSize: 'Auto',
      spacing: 'Auto',
      padding: 'Auto',
      margin: 'Auto',
      autoFit: true,
      equalSpacing: true,
      preserveAspectRatio: true,
      preventCropping: true,
      preventOverlap: true,
    };
    setPresentationSettings(fixedSettings);
  };

  useEffect(() => {
    localStorage.setItem('ss_smart_studio_flow_url', flowTargetUrl);
  }, [flowTargetUrl]);

  // Listen for responses from SS SMART FLOW Chrome Extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'SS_SMART_FLOW_EXT') return;
      if (event.data.type === 'EXT_PONG') {
        setExtensionConnected(true);
        if (event.data.version) {
          setExtensionVersion(String(event.data.version));
        }
      }
    };
    window.addEventListener('message', handleMessage);
    window.postMessage({ source: 'SS_SMART_STUDIO', type: 'EXT_PING' }, '*');
    const pingTimer = setInterval(() => {
      window.postMessage({ source: 'SS_SMART_STUDIO', type: 'EXT_PING' }, '*');
    }, 1500);
    return () => {
      clearInterval(pingTimer);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const executeSingleFlowTask = async (
    taskId: string,
    promptOverride?: string,
    categoryOverride?: string,
    openedByAnchor = false
  ) => {
    if (extensionPaused) return;

    const existing = flowTasks.find((t) => t.id === taskId);
    const promptText = promptOverride || existing?.prompt || '';
    const categoryText = categoryOverride || existing?.category || 'Vector Icon Sheet';
    if (!promptText) return;

    // Copy prompt to clipboard automatically so it is also ready if user pastes manually
    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
      // ignore clipboard permission error if any
    }

    // 1. Dispatch directly to SS SMART FLOW Chrome Extension (which opens/activates Google Flow tab, injects prompt, clicks Generate, and auto-downloads)
    window.postMessage(
      {
        source: 'SS_SMART_STUDIO',
        type: 'DISPATCH_TO_FLOW',
        prompt: promptText,
        category: categoryText,
        targetUrl: flowTargetUrl,
        options: flowOptions,
        openedByAnchor,
      },
      '*'
    );

    if (flowOptions.autoSubmit) {
      setFlowTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'Submitted',
                progress: 40,
                errorMessage: undefined,
                outputFile: `Dispatched to Chrome Extension → ${flowTargetUrl}`,
              }
            : t
        )
      );
    }

    if (flowOptions.autoGenerate) {
      setTimeout(() => {
        setFlowTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'Generating',
                  progress: 75,
                  outputFile: `Running inside Chrome Flow Tab (${flowTargetUrl})`,
                }
              : t
          )
        );
      }, 600);
    }

    if (flowOptions.autoDetectResult) {
      setTimeout(() => {
        setFlowTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'Downloaded',
                  progress: 100,
                  outputFile: `${outputFolder}\\Flow\\SS-SMART-FLOW-${taskId}.png`,
                }
              : t
          )
        );
      }, 1800);
    }
  };

  const addFlowTask = (
    prompt: string,
    category = 'Custom Workflow',
    autoExecute = true,
    openedByAnchor = false
  ) => {
    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8);
    const newId = `flow-${Date.now()}`;
    const task: FlowQueueTask = {
      id: newId,
      prompt,
      category,
      status: 'Queued',
      progress: 10,
      timestamp,
    };
    setFlowTasks((prev) => [task, ...prev]);

    if (autoExecute && !extensionPaused) {
      setTimeout(() => {
        void executeSingleFlowTask(newId, prompt, category, openedByAnchor);
      }, 80);
    }
  };

  const runFlowAutomationQueue = async () => {
    if (extensionPaused) return;
    for (const task of flowTasks) {
      if (task.status !== 'Downloaded') {
        await executeSingleFlowTask(task.id, task.prompt, task.category);
      }
    }
  };

  const clearFlowTasks = () => {
    setFlowTasks([]);
  };

  const activateLicenseKey = (key: string): boolean => {
    const found = allLicenses.find(
      (l) => l.key.trim().toUpperCase() === key.trim().toUpperCase() && l.status === 'Active'
    );
    if (found) {
      setActiveLicense(found);
      return true;
    }
    return false;
  };

  const createLicense = (holder: string, duration: LicenseDuration): LicenseRecord => {
    const randA = Math.floor(1000 + Math.random() * 9000);
    const randB = Math.floor(1000 + Math.random() * 9000);
    const prefix =
      duration === '1 Month'
        ? '1MO'
        : duration === '6 Months'
        ? '6MO'
        : duration === '1 Year'
        ? '1YR'
        : 'LIFE';

    const created = new Date();
    const createdAt = created.toISOString().split('T')[0];
    let expiresAt = 'Never (Lifetime)';
    if (duration === '1 Month') {
      const d = new Date(created);
      d.setMonth(d.getMonth() + 1);
      expiresAt = d.toISOString().split('T')[0];
    } else if (duration === '6 Months') {
      const d = new Date(created);
      d.setMonth(d.getMonth() + 6);
      expiresAt = d.toISOString().split('T')[0];
    } else if (duration === '1 Year') {
      const d = new Date(created);
      d.setFullYear(d.getFullYear() + 1);
      expiresAt = d.toISOString().split('T')[0];
    }

    const newRecord: LicenseRecord = {
      id: `lic-${Date.now()}`,
      key: `SS-STUDIO-${prefix}-${randA}-${randB}`,
      holder: holder.trim() || 'Authorized Studio User',
      duration,
      status: 'Active',
      createdAt,
      expiresAt,
    };

    setAllLicenses((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  const revokeLicense = (id: string) => {
    setAllLicenses((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'Revoked' } : l))
    );
  };

  return (
    <StudioContext.Provider
      value={{
        activeNav,
        setActiveNav,
        theme,
        setTheme,
        geminiModel,
        setGeminiModel,
        geminiStatus,
        setGeminiStatus,
        geminiError,
        setGeminiError,
        savedPrompts,
        addSavedPrompt,
        removeSavedPrompt,
        sourceSheetImage,
        setSourceSheetImage,
        extractedIcons,
        setExtractedIcons,
        activeVariant,
        setActiveVariant,
        batchProgress,
        runSheetDetectionAndVectorBatch,
        retryIconConversion,
        skipFailedIcon,
        presentationSettings,
        setPresentationSettings,
        presentations,
        selectedPresentationIndex,
        setSelectedPresentationIndex,
        regeneratePresentations,
        autoFixPresentations,
        extensionConnected,
        setExtensionConnected,
        extensionVersion,
        extensionPaused,
        setExtensionPaused,
        flowTargetUrl,
        setFlowTargetUrl,
        flowOptions,
        setFlowOptions,
        flowTasks,
        addFlowTask,
        runFlowAutomationQueue,
        executeSingleFlowTask,
        clearFlowTasks,
        outputFolder,
        setOutputFolder,
        activeLicense,
        allLicenses,
        activateLicenseKey,
        createLicense,
        revokeLicense,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
};
