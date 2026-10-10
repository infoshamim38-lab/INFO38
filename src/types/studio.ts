export type ThemeMode = 'DARK' | 'BLUE' | 'RED' | 'CYAN';

export type NavSection =
  | 'dashboard'
  | 'image-to-prompt'
  | 'prompt-studio'
  | 'vector-converter'
  | 'icon-extractor'
  | 'icon-sheet'
  | 'flow-automation'
  | 'extension'
  | 'settings';

export type ImagePromptMode =
  | 'General Image Prompt'
  | 'AI Image Generation Prompt'
  | 'Vector Prompt'
  | 'Icon Prompt'
  | 'Thumbnail Prompt';

export type IconVariant =
  | 'COLOR VECTOR'
  | 'VARIANT 01'
  | 'VARIANT 02'
  | 'VARIANT 03';

export interface StructuredPromptResult {
  subject: string;
  composition: string;
  style: string;
  color: string;
  lighting: string;
  background: string;
  details: string;
  quality: string;
  finalPrompt: string;
}

export interface SavedPromptItem {
  id: string;
  title: string;
  mode: string;
  createdAt: string;
  sourceThumbnail?: string;
  structured: StructuredPromptResult;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SVGValidationReport {
  isComplete: boolean;
  insideCanvas: boolean;
  noCrop: boolean;
  noOverlap: boolean;
  noBrokenPath: boolean;
  correctAspectRatio: boolean;
  safeMargin: boolean;
  validSvg: boolean;
}

export interface ExtractedIconItem {
  id: string;
  index: number;
  name: string; // e.g., "01.svg"
  bbox: BoundingBox;
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
  croppedDataUrl: string;
  svgContent: string;
  originalSvgContent?: string;
  palette?: string[];
  isVectorized?: boolean;
  colorSwapped?: boolean;
  colorUnified?: boolean;
  variant: IconVariant;
  status: 'Ready' | 'Processing' | 'Failed';
  errorMessage?: string;
  validation: SVGValidationReport;
}

export type PresentationIconShape =
  | 'none'
  | 'rounded-square'
  | 'circle'
  | 'squircle'
  | 'hexagon'
  | 'shield'
  | 'dashed-box'
  | 'soft-shadow';

export interface PresentationSettings {
  iconsPerPresentation: number;
  columns: 'Auto' | number;
  rows: 'Auto' | number;
  canvasWidth: 'Auto' | number;
  canvasHeight: 'Auto' | number;
  iconSize: 'Auto' | number;
  spacing: 'Auto' | number;
  padding: 'Auto' | number;
  margin: 'Auto' | number;
  autoFit: boolean;
  equalSpacing: boolean;
  preserveAspectRatio: boolean;
  preventCropping: boolean;
  preventOverlap: boolean;
  // Custom Presentation Designer options (Size, Shape, Text)
  iconShape?: PresentationIconShape;
  shapeFillColor?: string;
  shapeStrokeColor?: string;
  shapeStrokeWidth?: number;
  canvasBgColor?: string;
  showHeader?: boolean;
  headerLayout?: 'left' | 'center' | 'split-banner';
  titleText?: string;
  subtitleText?: string;
  badgeText?: string;
  footerText?: string;
  showFooter?: boolean;
  titleFontSize?: number;
  titleColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  iconLabelMode?: 'none' | 'hash' | 'number' | 'name';
  iconLabelColor?: string;
}

export interface PlacedPresentationIcon {
  icon: ExtractedIconItem;
  cellRow: number;
  cellCol: number;
  cellX: number;
  cellY: number;
  cellWidth: number;
  cellHeight: number;
  safeMargin: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  scale: number;
}

export interface IconSheetPresentation {
  id: string;
  index: number;
  title: string; // e.g. "Presentation 01"
  rangeLabel: string; // e.g. "Icon 01–25"
  canvasWidth: number;
  canvasHeight: number;
  columns: number;
  rows: number;
  padding: number;
  margin: number;
  spacingX: number;
  spacingY: number;
  placedIcons: PlacedPresentationIcon[];
  svgString: string;
  validation: SVGValidationReport;
  allPassed: boolean;
}

export interface FlowAutomationOptions {
  autoSubmit: boolean;
  autoGenerate: boolean;
  autoDetectResult: boolean;
  autoDownload: boolean;
}

export interface FlowQueueTask {
  id: string;
  prompt: string;
  category: string;
  status: 'Queued' | 'Submitted' | 'Generating' | 'Detected' | 'Downloaded' | 'Failed';
  progress: number;
  outputFile?: string;
  generatedImageUrl?: string;
  errorMessage?: string;
  timestamp: string;
}

export type LicenseDuration = '1 Month' | '6 Months' | '1 Year' | 'Lifetime';

export interface LicenseRecord {
  id: string;
  key: string;
  holder: string;
  duration: LicenseDuration;
  status: 'Active' | 'Revoked' | 'Expired';
  createdAt: string;
  expiresAt: string;
}
