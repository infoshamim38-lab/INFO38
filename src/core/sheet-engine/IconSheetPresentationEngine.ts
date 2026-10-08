import {
  ExtractedIconItem,
  IconSheetPresentation,
  PlacedPresentationIcon,
  PresentationSettings,
  SVGValidationReport,
} from '../../types/studio';

/**
 * Divides an array of individual SVG icons into multiple presentations based on
 * `iconsPerPresentation`, automatically calculates optimal grid columns/rows,
 * preserves exact original aspect ratios (`Scale X === Scale Y`), enforces safe margins,
 * prevents any cropping or overlap, and validates every icon before export.
 */
export function buildIconSheetPresentations(
  icons: ExtractedIconItem[],
  settings: PresentationSettings
): IconSheetPresentation[] {
  if (icons.length === 0) return [];

  const countPerSheet = Math.max(1, settings.iconsPerPresentation || 25);
  const totalSheets = Math.ceil(icons.length / countPerSheet);
  const presentations: IconSheetPresentation[] = [];

  for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
    const startIdx = sheetIdx * countPerSheet;
    const slice = icons.slice(startIdx, startIdx + countPerSheet);
    const startNum = String(startIdx + 1).padStart(2, '0');
    const endNum = String(startIdx + slice.length).padStart(2, '0');

    // Auto-calculate Columns & Rows
    const autoCols = Math.ceil(Math.sqrt(countPerSheet));
    const cols = settings.columns === 'Auto' ? autoCols : Math.max(1, Number(settings.columns));
    const autoRows = Math.ceil(slice.length / cols);
    const rows = settings.rows === 'Auto' ? autoRows : Math.max(1, Number(settings.rows));

    // Auto-calculate Canvas dimensions
    const canvasWidth = settings.canvasWidth === 'Auto' ? 1200 : Math.max(400, Number(settings.canvasWidth));
    const canvasHeight =
      settings.canvasHeight === 'Auto'
        ? Math.max(800, Math.round(canvasWidth * (rows / cols)))
        : Math.max(400, Number(settings.canvasHeight));

    // Auto-calculate Margin, Padding, Spacing
    const margin = settings.margin === 'Auto' ? Math.round(canvasWidth * 0.04) : Math.max(8, Number(settings.margin));
    const padding = settings.padding === 'Auto' ? Math.round(canvasWidth * 0.025) : Math.max(4, Number(settings.padding));
    const spacing = settings.spacing === 'Auto' ? Math.round(canvasWidth * 0.02) : Math.max(4, Number(settings.spacing));

    const innerAreaX = margin + padding;
    const innerAreaY = margin + padding;
    const innerAreaW = Math.max(100, canvasWidth - (margin + padding) * 2);
    const innerAreaH = Math.max(100, canvasHeight - (margin + padding) * 2);

    const totalSpacingX = Math.max(0, (cols - 1) * spacing);
    const totalSpacingY = Math.max(0, (rows - 1) * spacing);

    const cellWidth = (innerAreaW - totalSpacingX) / cols;
    const cellHeight = (innerAreaH - totalSpacingY) / rows;

    // Safe margin inside each cell so icons never touch cell boundary or clip
    const safeCellMargin = Math.max(8, Math.min(cellWidth, cellHeight) * 0.12);

    const placedIcons: PlacedPresentationIcon[] = [];
    const svgGroups: string[] = [];

    slice.forEach((icon, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;

      const cellX = innerAreaX + c * (cellWidth + spacing);
      const cellY = innerAreaY + r * (cellHeight + spacing);

      const availableW = Math.max(12, cellWidth - safeCellMargin * 2);
      const availableH = Math.max(12, cellHeight - safeCellMargin * 2);

      const origW = Math.max(1, icon.originalWidth || 96);
      const origH = Math.max(1, icon.originalHeight || 96);

      // Proportional scaling: Scale X === Scale Y ALWAYS
      let targetMaxDim = Math.min(availableW, availableH);
      if (settings.iconSize !== 'Auto') {
        const requestedSize = Number(settings.iconSize);
        targetMaxDim = settings.preventCropping
          ? Math.min(requestedSize, availableW, availableH)
          : requestedSize;
      }

      const scaleX = Math.min(availableW, targetMaxDim) / origW;
      const scaleY = Math.min(availableH, targetMaxDim) / origH;
      const uniformScale = Math.min(scaleX, scaleY);

      const drawWidth = origW * uniformScale;
      const drawHeight = origH * uniformScale;

      // Center inside cell with safe margin
      const drawX = cellX + (cellWidth - drawWidth) / 2;
      const drawY = cellY + (cellHeight - drawHeight) / 2;

      placedIcons.push({
        icon,
        cellRow: r,
        cellCol: c,
        cellX,
        cellY,
        cellWidth,
        cellHeight,
        safeMargin: safeCellMargin,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
        scale: uniformScale,
      });

      const innerMarkup = extractSvgInnerMarkup(icon.svgContent);
      const viewBox = extractSvgViewBox(icon.svgContent, origW, origH);

      svgGroups.push(
        `  <svg x="${drawX.toFixed(2)}" y="${drawY.toFixed(2)}" width="${drawWidth.toFixed(2)}" height="${drawHeight.toFixed(2)}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">\n    ${innerMarkup}\n  </svg>`
      );
    });

    const sheetNumber = String(sheetIdx + 1).padStart(2, '0');
    const svgString = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">`,
      `  <rect width="${canvasWidth}" height="${canvasHeight}" fill="#FFFFFF" />`,
      ...svgGroups,
      `</svg>`,
    ].join('\n');

    const validation = validatePresentationSheet(placedIcons, canvasWidth, canvasHeight, svgString);
    const allPassed = Object.values(validation).every(Boolean);

    presentations.push({
      id: `presentation-${sheetNumber}`,
      index: sheetIdx + 1,
      title: `Presentation ${sheetNumber}`,
      rangeLabel: `Icon ${startNum}–${endNum}`,
      canvasWidth,
      canvasHeight,
      columns: cols,
      rows,
      padding,
      margin,
      spacingX: spacing,
      spacingY: spacing,
      placedIcons,
      svgString,
      validation,
      allPassed,
    });
  }

  return presentations;
}

function extractSvgInnerMarkup(svgContent: string): string {
  const match = svgContent.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  return match ? match[1].trim() : svgContent;
}

function extractSvgViewBox(svgContent: string, fallbackW: number, fallbackH: number): string {
  const match = svgContent.match(/viewBox=["']([^"']+)["']/i);
  return match ? match[1] : `0 0 ${fallbackW} ${fallbackH}`;
}

export function validatePresentationSheet(
  placed: PlacedPresentationIcon[],
  canvasW: number,
  canvasH: number,
  svgString: string
): SVGValidationReport {
  let isComplete = placed.length > 0;
  let insideCanvas = true;
  let noCrop = true;
  let noOverlap = true;
  let noBrokenPath = true;
  let correctAspectRatio = true;
  let safeMargin = true;

  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    if (!p.icon.validation.isComplete) isComplete = false;
    if (!p.icon.validation.noBrokenPath) noBrokenPath = false;

    // Check inside canvas boundary
    if (
      p.drawX < 0 ||
      p.drawY < 0 ||
      p.drawX + p.drawWidth > canvasW + 0.5 ||
      p.drawY + p.drawHeight > canvasH + 0.5
    ) {
      insideCanvas = false;
      noCrop = false;
    }

    // Check safe margin inside cell
    if (
      p.drawWidth > p.cellWidth - p.safeMargin + 0.5 ||
      p.drawHeight > p.cellHeight - p.safeMargin + 0.5
    ) {
      safeMargin = false;
    }

    // Check original aspect ratio preservation
    const origRatio = p.icon.originalWidth / p.icon.originalHeight;
    const drawRatio = p.drawWidth / p.drawHeight;
    if (Math.abs(origRatio - drawRatio) > 0.02) {
      correctAspectRatio = false;
    }

    // Check overlap with any other icon
    for (let j = i + 1; j < placed.length; j++) {
      const q = placed[j];
      const overlapX = p.drawX < q.drawX + q.drawWidth && p.drawX + p.drawWidth > q.drawX;
      const overlapY = p.drawY < q.drawY + q.drawHeight && p.drawY + p.drawHeight > q.drawY;
      if (overlapX && overlapY) {
        noOverlap = false;
      }
    }
  }

  const validSvg = svgString.startsWith('<svg') && svgString.endsWith('</svg>') && !svgString.includes('NaN');

  return {
    isComplete,
    insideCanvas,
    noCrop,
    noOverlap,
    noBrokenPath,
    correctAspectRatio,
    safeMargin,
    validSvg,
  };
}
