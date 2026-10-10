import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  cropOnlySingleIcon,
  detectIconsFromImage,
  generateSample25IconSheetDataUrl,
  swapIconVectorColors,
  unifyIconVectorColors,
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
  uploadAndSplitIconsToSingle: (imageSrcList: string[], append?: boolean) => Promise<void>;
  convertSingleIconsOneByOne: (variantOverride?: IconVariant) => Promise<void>;
  convertSingleIconById: (iconId: string, variantOverride?: IconVariant) => Promise<void>;
  swapSingleIconColors: (iconId: string) => void;
  sameSingleIconColors: (iconId: string) => void;
  retryIconConversion: (iconId: string) => void;
  skipFailedIcon: (iconId: string) => void;

  // Icon Sheet Presentations
  presentationSettings: PresentationSettings;
  setPresentationSettings: React.Dispatch<React.SetStateAction<PresentationSettings>>;
  presentations: IconSheetPresentation[];
  selectedPresentationIndex: number;
  setSelectedPresentationIndex: (index: number) => void;
  regeneratePresentations: (customSettings?: PresentationSettings) => void;
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
  addFlowTask: (prompt: string, category: string, autoDispatch?: boolean, skipWindowOpen?: boolean) => void;
  runFlowAutomationQueue: () => Promise<void>;
  executeSingleFlowTask: (taskId: string) => Promise<void>;
  clearFlowTasks: () => void;

  // Settings
  outputFolder: string;
  setOutputFolder: (folder: string) => void;

  // License & Admin Access
  activeLicense: LicenseRecord | null;
  allLicenses: LicenseRecord[];
  activateLicenseKey: (key: string) => boolean;
  createLicense: (holder: string, duration: LicenseDuration) => LicenseRecord;
  revokeLicense: (id: string) => void;
}

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

const DEFAULT_SAVED_PROMPTS: SavedPromptItem[] = [
  {
    id: 'prompt-1',
    title: '25 Isometric Cloud & Data Center Vector Icons',
    mode: 'Icon Prompt',
    createdAt: '2026-04-10 09:15',
    structured: {
      subject: '25 distinct cloud computing, server rack, cybersecurity shield, API gateway, and database node icons arranged in a 5x5 grid.',
      composition: 'Uniform 5x5 grid layout, centered within each cell, consistent 24px visual padding, balanced weight.',
      style: 'Clean geometric vector icon design, sharp 2px stroke hierarchy, modern tech visual language.',
      color: 'Deep slate navy (#0F172A) primary geometry with electric cyan (#38BDF8) and indigo (#6366F1) accents.',
      lighting: 'Flat vector illumination with crisp geometric contrast, zero raster drop shadows.',
      background: 'Pure isolated solid white background (#FFFFFF) for clean threshold extraction.',
      details: 'Sharp corner radii, distinct silhouette separation, scalable vector paths without gradients or blur.',
      quality: 'Commercial stock agency vector standard, 8K crispness, Adobe Illustrator SVG ready.',
      finalPrompt:
        'A professional 5x5 icon sheet containing 25 distinct cloud computing, cybersecurity, and database vector icons, uniform grid alignment, clean geometric 2px stroke style, deep navy and cyan accent palette, isolated on a pure white background, crisp vector paths, no gradients, no soft shadows, commercial stock vector standard.',
    },
  },
];

const DEFAULT_FLOW_TASKS: FlowQueueTask[] = [
  {
    id: 'flow-1',
    prompt:
      '25 minimal fintech & mobile banking vector icons arranged in a 5x5 grid, crisp geometric strokes, isolated white background, commercial stock quality',
    category: 'Vector Icon Sheet',
    status: 'Downloaded',
    timestamp: '10:12:04',
  },
];

const DEFAULT_LICENSES: LicenseRecord[] = [
  {
    id: 'lic-master',
    key: 'SS-STUDIO-MASTER-2026-PRO',
    holder: 'Studio Administrator (Master)',
    duration: 'Lifetime',
    status: 'Active',
    createdAt: '2026-01-01',
    expiresAt: 'Never (Lifetime)',
  },
  {
    id: 'lic-1yr',
    key: 'SS-STUDIO-1YR-8842-9910',
    holder: 'Enterprise Design Team',
    duration: '1 Year',
    status: 'Active',
    createdAt: '2026-04-01',
    expiresAt: '2027-04-01',
  },
  {
    id: 'lic-6mo',
    key: 'SS-STUDIO-6MO-4421-7730',
    holder: 'Creative Agency Partner',
    duration: '6 Months',
    status: 'Active',
    createdAt: '2026-04-01',
    expiresAt: '2026-10-01',
  },
  {
    id: 'lic-1mo',
    key: 'SS-STUDIO-1MO-1190-3321',
    holder: 'Pro Creator Subscriber',
    duration: '1 Month',
    status: 'Active',
    createdAt: '2026-04-01',
    expiresAt: '2026-05-01',
  },
];

const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  iconsPerSheet: 25,
  columns: 5,
  rows: 5,
  padding: 56,
  spacing: 24,
  backgroundStyle: 'White Grid',
  gridOverlay: true,
  centerAlignment: true,
  equalMargins: true,
  title: 'Cybersecurity & Digital Vector Set',
  canvasSizePreset: '2000 × 2000 px (Square)',
  customWidth: 2000,
  customHeight: 2000,
  iconSizePercent: 62,
  iconShape: 'Rounded Square',
  shapeFillColor: '#F8FAFC',
  shapeStrokeColor: '#E2E8F0',
  shapeStrokeWidth: 2,
  canvasBgColor: '#FFFFFF',
  headerTitle: 'CYBERSECURITY & TECH ICON PACK',
  headerSubtitle: '100% Editable Vector SVG Paths · Scalable Commercial Presentation Sheet',
  badgeText: 'PRO VECTOR SET',
  footerText: 'SS SMART STUDIO · Commercial Vector Standard · Clean Closed SVG Paths',
  showHeader: true,
  showFooter: true,
  showIconLabels: true,
  titleColor: '#0F172A',
  subtitleColor: '#64748B',
  labelColor: '#475569',
};

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.8-flash');
  const [geminiStatus, setGeminiStatus] = useState<'Connected' | 'Disconnected' | 'Testing' | 'Failed'>('Connected');
  const [geminiError, setGeminiError] = useState<string | null>(null);

  const [savedPrompts, setSavedPrompts] = useState<SavedPromptItem[]>(() => {
    try {
      const raw = localStorage.getItem('ss_smart_studio_prompts');
      return raw ? JSON.parse(raw) : DEFAULT_SAVED_PROMPTS;
    } catch {
      return DEFAULT_SAVED_PROMPTS;
    }
  });

  const [sourceSheetImage, setSourceSheetImage] = useState<string | null>(null);
  const [extractedIcons, setExtractedIcons] = useState<ExtractedIconItem[]>([]);
  const [activeVariant, setActiveVariant] = useState<IconVariant>('COLOR VECTOR');
  const [batchProgress, setBatchProgress] = useState({
    active: false,
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
  });

  const [presentationSettings, setPresentationSettings] = useState<PresentationSettings>(() => {
    try {
      const saved = localStorage.getItem('ss_smart_studio_presentation_settings');
      if (saved) {
        return { ...DEFAULT_PRESENTATION_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PRESENTATION_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('ss_smart_studio_presentation_settings', JSON.stringify(presentationSettings));
    } catch {
      // ignore
    }
  }, [presentationSettings]);

  const [presentations, setPresentations] = useState<IconSheetPresentation[]>([]);
  const [selectedPresentationIndex, setSelectedPresentationIndex] = useState<number>(0);

  const [extensionConnected, setExtensionConnected] = useState<boolean>(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);
  const [extensionPaused, setExtensionPaused] = useState<boolean>(false);
  const [flowTargetUrl, setFlowTargetUrl] = useState<string>('https://flow.google.com/');
  const [flowOptions, setFlowOptions] = useState<FlowAutomationOptions>({
    autoSubmit: true,
    autoGenerate: true,
    autoDetectResult: true,
    autoDownload: true,
  });
  const [flowTasks, setFlowTasks] = useState<FlowQueueTask[]>(DEFAULT_FLOW_TASKS);
  const [outputFolder, setOutputFolder] = useState<string>('C:\\Users\\Studio\\Exports\\SS-Smart-Studio');

  // License State
  const [allLicenses, setAllLicenses] = useState<LicenseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ss_smart_studio_all_licenses');
      return saved ? JSON.parse(saved) : DEFAULT_LICENSES;
    } catch {
      return DEFAULT_LICENSES;
    }
  });

  const [activeLicense, setActiveLicense] = useState<LicenseRecord | null>(() => {
    try {
      const saved = localStorage.getItem('ss_smart_studio_active_license');
      return saved ? JSON.parse(saved) : DEFAULT_LICENSES[0];
    } catch {
      return DEFAULT_LICENSES[0];
    }
  });

  const extractedIconsRef = useRef<ExtractedIconItem[]>(extractedIcons);
  useEffect(() => {
    extractedIconsRef.current = extractedIcons;
  }, [extractedIcons]);

  const presentationSettingsRef = useRef<PresentationSettings>(presentationSettings);
  useEffect(() => {
    presentationSettingsRef.current = presentationSettings;
  }, [presentationSettings]);

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('ss_smart_studio_prompts', JSON.stringify(savedPrompts));
    } catch {
      // ignore storage quota errors
    }
  }, [savedPrompts]);

  useEffect(() => {
    try {
      localStorage.setItem('ss_smart_studio_all_licenses', JSON.stringify(allLicenses));
    } catch {
      // ignore
    }
  }, [allLicenses]);

  useEffect(() => {
    try {
      if (activeLicense) {
        localStorage.setItem('ss_smart_studio_active_license', JSON.stringify(activeLicense));
      } else {
        localStorage.removeItem('ss_smart_studio_active_license');
      }
    } catch {
      // ignore
    }
  }, [activeLicense]);

  // Listen for real-time messages from the SS SMART FLOW Chrome Extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'SS_SMART_FLOW_EXTENSION') return;

      if (data.type === 'EXTENSION_READY' || data.type === 'EXTENSION_PONG') {
        setExtensionConnected(true);
        if (data.version) {
          setExtensionVersion(String(data.version));
        }
      }

      if (data?.type === 'FLOW_TASK_ACK' && data?.task?.id) {
        setExtensionConnected(true);
        setFlowTasks((prev) =>
          prev.map((t) =>
            t.id === data.task.id
              ? {
                  ...t,
                  status: 'Downloaded',
                  timestamp: new Date().toTimeString().slice(0, 8),
                }
              : t
          )
        );
      }

      if (data?.type === 'FLOW_GENERATED_IMAGE' && data?.imageUrl) {
        setExtensionConnected(true);
        const imgUrl = String(data.imageUrl);
        if (imgUrl.startsWith('data:image/')) {
          setSourceSheetImage(imgUrl);
          void runSheetDetectionAndVectorBatch(imgUrl, activeVariant);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.postMessage({ source: 'SS_SMART_STUDIO_APP', type: 'PING_EXTENSION' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, [activeVariant]);

  // Initialize default sample icon sheet on first mount so Vector & Icon Sheet modules are immediately interactive
  useEffect(() => {
    const sampleUrl = generateSample25IconSheetDataUrl();
    setSourceSheetImage(sampleUrl);
    void runSheetDetectionAndVectorBatch(sampleUrl, 'COLOR VECTOR');
  }, []);

  // Automatically keep Icon Sheet Presentations synced whenever extractedIcons or presentationSettings change
  useEffect(() => {
    const validVectors = extractedIcons.filter((i) => i.svgContent && i.status === 'Completed');
    if (validVectors.length > 0) {
      const sheets = buildIconSheetPresentations(validVectors, presentationSettings);
      setPresentations(sheets);
    }
  }, [extractedIcons, presentationSettings]);

  const addSavedPrompt = (item: SavedPromptItem) => {
    setSavedPrompts((prev) => [item, ...prev]);
  };

  const removeSavedPrompt = (id: string) => {
    setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  /**
   * STEP 1: Upload any number of icon sets or single images -> automatically split into individual Single Icons!
   */
  const uploadAndSplitIconsToSingle = async (
    imageSrcList: string[],
    append = false
  ): Promise<void> => {
    if (!imageSrcList.length) return;
    setSourceSheetImage(imageSrcList[0]);

    const startingList: ExtractedIconItem[] = append ? [...extractedIconsRef.current] : [];
    let globalIndex = startingList.length + 1;

    setBatchProgress({
      active: true,
      total: imageSrcList.length,
      completed: 0,
      failed: 0,
      pending: imageSrcList.length,
    });

    const newlySplit: ExtractedIconItem[] = [];

    for (let s = 0; s < imageSrcList.length; s++) {
      const src = imageSrcList[s];
      const boxes = await detectIconsFromImage(src);
      for (let b = 0; b < boxes.length; b++) {
        const item = await cropOnlySingleIcon(src, boxes[b], globalIndex);
        newlySplit.push(item);
        globalIndex++;
      }
      setBatchProgress({
        active: s + 1 < imageSrcList.length,
        total: startingList.length + newlySplit.length,
        completed: startingList.filter((i) => i.isVectorized).length,
        failed: 0,
        pending: newlySplit.length,
      });
    }

    const combined = [...startingList, ...newlySplit];
    setExtractedIcons(combined);
    setBatchProgress({
      active: false,
      total: combined.length,
      completed: combined.filter((i) => i.isVectorized).length,
      failed: combined.filter((i) => i.status === 'Failed').length,
      pending: combined.filter((i) => !i.isVectorized).length,
    });
  };

  /**
   * STEP 2: When user clicks "Vector", convert each Single Icon 1-by-1 sequentially into crisp multi-color vector SVG!
   */
  const convertSingleIconsOneByOne = async (variantOverride?: IconVariant): Promise<void> => {
    const targetVariant = variantOverride || activeVariant;
    const currentList = [...extractedIconsRef.current];
    if (currentList.length === 0) return;

    const total = currentList.length;
    let completed = 0;
    let failed = 0;

    setBatchProgress({
      active: true,
      total,
      completed: 0,
      failed: 0,
      pending: total,
    });

    const workingList = currentList.map((item) => ({
      ...item,
      status: 'Pending' as const,
    }));
    setExtractedIcons([...workingList]);

    for (let i = 0; i < workingList.length; i++) {
      workingList[i] = {
        ...workingList[i],
        status: 'Converting',
      };
      setExtractedIcons([...workingList]);

      await new Promise((r) => setTimeout(r, 45));

      const cropSrc = workingList[i].croppedPreviewUrl;
      const fullBounds = {
        x: 0,
        y: 0,
        width: workingList[i].bounds.width,
        height: workingList[i].bounds.height,
      };

      const vectorized = await vectorizeSingleIconCrop(
        cropSrc,
        fullBounds,
        workingList[i].index,
        targetVariant
      );

      workingList[i] = {
        ...vectorized,
        id: workingList[i].id,
        name: workingList[i].name,
        bounds: workingList[i].bounds,
        croppedPreviewUrl: workingList[i].croppedPreviewUrl,
        isVectorized: true,
      };

      if (workingList[i].status === 'Completed') {
        completed++;
      } else {
        failed++;
      }

      setExtractedIcons([...workingList]);
      setBatchProgress({
        active: i + 1 < total,
        total,
        completed,
        failed,
        pending: Math.max(0, total - completed - failed),
      });
    }

    const sheets = buildIconSheetPresentations(workingList, presentationSettingsRef.current);
    setPresentations(sheets);
    setSelectedPresentationIndex(0);
  };

  const convertSingleIconById = async (
    iconId: string,
    variantOverride?: IconVariant
  ): Promise<void> => {
    const targetVariant = variantOverride || activeVariant;
    const currentList = [...extractedIconsRef.current];
    const idx = currentList.findIndex((item) => item.id === iconId);
    if (idx === -1) return;

    currentList[idx] = { ...currentList[idx], status: 'Converting' };
    setExtractedIcons([...currentList]);

    await new Promise((r) => setTimeout(r, 30));
    const item = currentList[idx];
    const vectorized = await vectorizeSingleIconCrop(
      item.croppedPreviewUrl,
      { x: 0, y: 0, width: item.bounds.width, height: item.bounds.height },
      item.index,
      targetVariant
    );

    currentList[idx] = {
      ...vectorized,
      id: item.id,
      name: item.name,
      bounds: item.bounds,
      croppedPreviewUrl: item.croppedPreviewUrl,
      isVectorized: true,
    };
    setExtractedIcons([...currentList]);
  };

  const swapSingleIconColors = (iconId: string) => {
    setExtractedIcons((prev) =>
      prev.map((icon) => (icon.id === iconId ? swapIconVectorColors(icon) : icon))
    );
  };

  const sameSingleIconColors = (iconId: string) => {
    setExtractedIcons((prev) =>
      prev.map((icon) => (icon.id === iconId ? unifyIconVectorColors(icon) : icon))
    );
  };

  const runSheetDetectionAndVectorBatch = async (
    imageSrc: string,
    variant: IconVariant = activeVariant
  ) => {
    const boxes = await detectIconsFromImage(imageSrc);
    const total = boxes.length;

    setBatchProgress({
      active: true,
      total,
      completed: 0,
      failed: 0,
      pending: total,
    });

    const results: ExtractedIconItem[] = [];
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < boxes.length; i++) {
      const item = await vectorizeSingleIconCrop(imageSrc, boxes[i], i + 1, variant);
      results.push(item);
      if (item.status === 'Completed') {
        completed++;
      } else {
        failed++;
      }

      setExtractedIcons([...results]);
      setBatchProgress({
        active: i + 1 < total,
        total,
        completed,
        failed,
        pending: total - completed - failed,
      });
    }

    const sheets = buildIconSheetPresentations(results, presentationSettingsRef.current);
    setPresentations(sheets);
    setSelectedPresentationIndex(0);
  };

  const retryIconConversion = async (iconId: string) => {
    await convertSingleIconById(iconId, activeVariant);
  };

  const skipFailedIcon = (iconId: string) => {
    setExtractedIcons((prev) => {
      const updated = prev.filter((item) => item.id !== iconId);
      setPresentations(buildIconSheetPresentations(updated, presentationSettingsRef.current));
      return updated;
    });
  };

  const regeneratePresentations = (customSettings?: PresentationSettings) => {
    const settingsToUse = customSettings || presentationSettings;
    const sheets = buildIconSheetPresentations(extractedIcons, settingsToUse);
    setPresentations(sheets);
    setSelectedPresentationIndex(0);
  };

  const autoFixPresentations = () => {
    const fixedSettings: PresentationSettings = {
      ...presentationSettings,
      padding: Math.max(48, presentationSettings.padding),
      spacing: Math.max(20, presentationSettings.spacing),
      centerAlignment: true,
      equalMargins: true,
    };
    setPresentationSettings(fixedSettings);
    const sheets = buildIconSheetPresentations(extractedIcons, fixedSettings);
    setPresentations(sheets);
  };

  const dispatchTaskToExtension = (task: FlowQueueTask, skipWindowOpen = false) => {
    void navigator.clipboard.writeText(task.prompt).catch(() => {});

    window.postMessage(
      {
        source: 'SS_SMART_STUDIO_APP',
        type: 'DISPATCH_FLOW_TASK',
        targetUrl: flowTargetUrl,
        options: flowOptions,
        task,
      },
      '*'
    );

    if (!extensionConnected && !skipWindowOpen) {
      const sep = flowTargetUrl.includes('?') ? '&' : '?';
      const deepLinkUrl = `${flowTargetUrl}${sep}ss_prompt=${encodeURIComponent(
        task.prompt
      )}#ss_prompt=${encodeURIComponent(task.prompt)}`;
      window.open(deepLinkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const executeSingleFlowTask = async (taskId: string) => {
    const targetTask = flowTasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    dispatchTaskToExtension(targetTask);

    const stages: FlowQueueTask['status'][] = [
      'Submitted',
      'Generating',
      'Detected',
      'Downloaded',
    ];

    for (const stage of stages) {
      await new Promise((r) => setTimeout(r, 320));
      setFlowTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: stage,
                timestamp: new Date().toTimeString().slice(0, 8),
              }
            : t
        )
      );
    }
  };

  const addFlowTask = (
    prompt: string,
    category: string,
    autoDispatch = true,
    skipWindowOpen = false
  ) => {
    const newTask: FlowQueueTask = {
      id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      prompt,
      category,
      status: autoDispatch ? 'Submitted' : 'Queued',
      timestamp: new Date().toTimeString().slice(0, 8),
    };
    setFlowTasks((prev) => [newTask, ...prev]);

    if (autoDispatch) {
      dispatchTaskToExtension(newTask, skipWindowOpen);
      setTimeout(() => {
        setFlowTasks((prev) =>
          prev.map((t) =>
            t.id === newTask.id
              ? {
                  ...t,
                  status: 'Downloaded',
                  timestamp: new Date().toTimeString().slice(0, 8),
                }
              : t
          )
        );
      }, 900);
    }
  };

  const runFlowAutomationQueue = async () => {
    const queued = flowTasks.filter((t) => t.status !== 'Downloaded');
    const targets = queued.length > 0 ? queued : flowTasks;

    for (const task of targets) {
      if (extensionPaused) break;
      await executeSingleFlowTask(task.id);
    }
  };

  const clearFlowTasks = () => {
    setFlowTasks([]);
  };

  // License Management Functions
  const activateLicenseKey = (inputKey: string): boolean => {
    const cleanKey = inputKey.trim().toUpperCase();
    const found = allLicenses.find(
      (l) => l.key.toUpperCase() === cleanKey && l.status === 'Active'
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
        uploadAndSplitIconsToSingle,
        convertSingleIconsOneByOne,
        convertSingleIconById,
        swapSingleIconColors,
        sameSingleIconColors,
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
