import {
  ExtractedIconItem,
  IconSheetPresentation,
  PlacedPresentationIcon,
  PresentationIconShape,
  PresentationSettings,
  SVGValidationReport,
} from '../../types/studio';

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderContainerShapeSvg(
  shape: PresentationIconShape,
  cx: number,
  cy: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  strokeW: number
): string {
  if (!shape || shape === 'none') return '';
  const size = Math.min(w, h) * 0.9;
  const x = cx - size / 2;
  const y = cy - size / 2;
  const r = size / 2;
  const strokeAttr = strokeW > 0 ? ` stroke="${stroke}" stroke-width="${strokeW}"` : '';

  switch (shape) {
    case 'rounded-square':
      return `  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${(size * 0.22).toFixed(1)}" fill="${fill}"${strokeAttr} />`;
    case 'squircle':
      return `  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${(size * 0.34).toFixed(1)}" fill="${fill}"${strokeAttr} />`;
    case 'circle':
      return `  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}"${strokeAttr} />`;
    case 'dashed-box':
      return `  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${(size * 0.16).toFixed(1)}" fill="${fill}" stroke="${stroke || '#94A3B8'}" stroke-width="${Math.max(1.5, strokeW)}" stroke-dasharray="6 4" />`;
    case 'soft-shadow':
      return [
        `  <rect x="${(x + 3).toFixed(1)}" y="${(y + 5).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${(size * 0.22).toFixed(1)}" fill="rgba(15,23,42,0.07)" />`,
        `  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${(size * 0.22).toFixed(1)}" fill="${fill}" stroke="${stroke || '#E2E8F0'}" stroke-width="${Math.max(1.5, strokeW)}" />`,
      ].join('\n');
    case 'hexagon': {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const ang = ((i * 60 - 30) * Math.PI) / 180;
        pts.push(`${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`);
      }
      return `  <polygon points="${pts.join(' ')}" fill="${fill}"${strokeAttr} stroke-linejoin="round" />`;
    }
    case 'shield': {
      const topY = cy - r * 0.92;
      const botY = cy + r * 0.95;
      const leftX = cx - r * 0.82;
      const rightX = cx + r * 0.82;
      const midY = cy + r * 0.15;
      const d = `M ${cx.toFixed(1)} ${topY.toFixed(1)} L ${rightX.toFixed(1)} ${(topY + r * 0.35).toFixed(1)} L ${rightX.toFixed(1)} ${midY.toFixed(1)} Q ${rightX.toFixed(1)} ${(botY - r * 0.15).toFixed(1)} ${cx.toFixed(1)} ${botY.toFixed(1)} Q ${leftX.toFixed(1)} ${(botY - r * 0.15).toFixed(1)} ${leftX.toFixed(1)} ${midY.toFixed(1)} L ${leftX.toFixed(1)} ${(topY + r * 0.35).toFixed(1)} Z`;
      return `  <path d="${d}" fill="${fill}"${strokeAttr} stroke-linejoin="round" />`;
    }
    default:
      return '';
  }
}

/**
 * Divides an array of individual SVG icons into multiple presentations based on
 * `iconsPerPresentation`, automatically calculates optimal grid columns/rows,
 * renders custom Sizes, Shapes, and Texts (Header, Subtitle, Badge, Footer, Icon Labels),
 * and validates every icon before export.
 */
export function buildIconSheetPresentations(
  icons: ExtractedIconItem[],
  settings: PresentationSettings
): IconSheetPresentation[] {
  if (icons.length === 0) return [];

  const countPerSheet = Math.max(1, settings.iconsPerPresentation || 25);
  const totalSheets = Math.ceil(icons.length / countPerSheet);
  const presentations: IconSheetPresentation[] = [];

  const iconShape: PresentationIconShape = settings.iconShape || 'none';
  const shapeFillColor = settings.shapeFillColor || '#F8FAFC';
  const shapeStrokeColor = settings.shapeStrokeColor || '#E2E8F0';
  const shapeStrokeWidth = settings.shapeStrokeWidth ?? 1.5;
  const canvasBgColor = settings.canvasBgColor || '#FFFFFF';
  const showHeader = Boolean(settings.showHeader);
  const showFooter = Boolean(settings.showFooter);
  const headerLayout = settings.headerLayout || 'center';
  const titleText = settings.titleText ?? 'MODERN VECTOR ICON SET';
  const subtitleText = settings.subtitleText ?? '100% Scalable Vector Graphics · Editable Stroke & Color Palette';
  const badgeText = settings.badgeText ?? `${icons.length} PREMIUM ICONS`;
  const footerText = settings.footerText ?? 'SS SMART STUDIO · PROFESSIONAL ICON PRESENTATION SHEET';
  const titleFontSize = settings.titleFontSize || 34;
  const titleColor = settings.titleColor || '#0F172A';
  const subtitleColor = settings.subtitleColor || '#475569';
  const accentColor = settings.accentColor || '#2563EB';
  const iconLabelMode = settings.iconLabelMode || 'none';
  const iconLabelColor = settings.iconLabelColor || '#64748B';

  for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
    const startIdx = sheetIdx * countPerSheet;
    const slice = icons.slice(startIdx, startIdx + countPerSheet);
    const startNum = String(startIdx + 1).padStart(2, '0');
    const endNum = String(startIdx + slice.length).padStart(2, '0');

    // Auto-calculate Columns & Rows based on actual slice count if small set (e.g. 6 icons -> 3x2)
    const effectiveCount = Math.min(countPerSheet, Math.max(slice.length, 1));
    const autoCols = effectiveCount === 6 ? 3 : Math.ceil(Math.sqrt(effectiveCount));
    const cols = settings.columns === 'Auto' ? autoCols : Math.max(1, Number(settings.columns));
    const autoRows = Math.max(1, Math.ceil(slice.length / cols));
    const rows = settings.rows === 'Auto' ? autoRows : Math.max(1, Number(settings.rows));

    // Auto-calculate Canvas dimensions
    const canvasWidth = settings.canvasWidth === 'Auto' ? 1200 : Math.max(400, Number(settings.canvasWidth));
    const headerReserve = showHeader ? Math.round(titleFontSize * 3.4) : 0;
    const footerReserve = showFooter ? 56 : 0;
    const canvasHeight =
      settings.canvasHeight === 'Auto'
        ? Math.max(750, Math.round(canvasWidth * (rows / cols) * 0.85) + headerReserve + footerReserve)
        : Math.max(400, Number(settings.canvasHeight));

    const margin = settings.margin === 'Auto' ? Math.round(canvasWidth * 0.04) : Math.max(8, Number(settings.margin));
    const padding = settings.padding === 'Auto' ? Math.round(canvasWidth * 0.025) : Math.max(4, Number(settings.padding));
    const spacing = settings.spacing === 'Auto' ? Math.round(canvasWidth * 0.02) : Math.max(4, Number(settings.spacing));

    const innerAreaX = margin + padding;
    const innerAreaY = margin + padding + headerReserve;
    const innerAreaW = Math.max(100, canvasWidth - (margin + padding) * 2);
    const innerAreaH = Math.max(100, canvasHeight - (margin + padding) * 2 - headerReserve - footerReserve);

    const totalSpacingX = Math.max(0, (cols - 1) * spacing);
    const totalSpacingY = Math.max(0, (rows - 1) * spacing);

    const cellWidth = (innerAreaW - totalSpacingX) / cols;
    const cellHeight = (innerAreaH - totalSpacingY) / rows;

    const labelReserveH = iconLabelMode !== 'none' ? 24 : 0;
    const shapeRatio = iconShape !== 'none' ? 0.24 : 0.12;
    const safeCellMargin = Math.max(8, Math.min(cellWidth, cellHeight - labelReserveH) * shapeRatio);

    const placedIcons: PlacedPresentationIcon[] = [];
    const svgGroups: string[] = [];

    // Optional Header Banner (Text & Badge customization)
    if (showHeader) {
      const headerY = margin + 10;
      if (headerLayout === 'split-banner') {
        svgGroups.push(
          `  <rect x="${margin}" y="${headerY}" width="${canvasWidth - margin * 2}" height="${Math.max(84, headerReserve - 16)}" rx="18" fill="${accentColor}" />`,
          `  <text x="${margin + 32}" y="${headerY + 42}" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif" font-size="${titleFontSize}" font-weight="800">${escapeXml(titleText)}</text>`,
          `  <text x="${margin + 32}" y="${headerY + 68}" fill="rgba(255,255,255,0.85)" font-family="Inter, system-ui, sans-serif" font-size="${Math.max(13, Math.round(titleFontSize * 0.44))}" font-weight="500">${escapeXml(subtitleText)}</text>`
        );
        if (badgeText) {
          const bw = Math.max(140, badgeText.length * 10 + 36);
          const bx = canvasWidth - margin - bw - 28;
          const by = headerY + Math.max(20, (headerReserve - 16 - 38) / 2);
          svgGroups.push(
            `  <rect x="${bx}" y="${by}" width="${bw}" height="38" rx="19" fill="#FFFFFF" />`,
            `  <text x="${bx + bw / 2}" y="${by + 24}" text-anchor="middle" fill="${accentColor}" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="800">${escapeXml(badgeText)}</text>`
          );
        }
      } else {
        const isCenter = headerLayout === 'center';
        const anchor = isCenter ? 'middle' : 'start';
        const tx = isCenter ? canvasWidth / 2 : innerAreaX;
        if (badgeText) {
          const bw = Math.max(130, badgeText.length * 9 + 30);
          const bx = isCenter ? (canvasWidth - bw) / 2 : innerAreaX;
          svgGroups.push(
            `  <rect x="${bx.toFixed(1)}" y="${headerY}" width="${bw}" height="28" rx="14" fill="${accentColor}" opacity="0.12" />`,
            `  <text x="${(bx + bw / 2).toFixed(1)}" y="${headerY + 19}" text-anchor="middle" fill="${accentColor}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="800" letter-spacing="0.06em">${escapeXml(badgeText)}</text>`
          );
        }
        const titleY = headerY + (badgeText ? 60 : 34);
        svgGroups.push(
          `  <text x="${tx}" y="${titleY}" text-anchor="${anchor}" fill="${titleColor}" font-family="Inter, system-ui, sans-serif" font-size="${titleFontSize}" font-weight="800">${escapeXml(titleText)}</text>`
        );
        if (subtitleText) {
          svgGroups.push(
            `  <text x="${tx}" y="${titleY + 26}" text-anchor="${anchor}" fill="${subtitleColor}" font-family="Inter, system-ui, sans-serif" font-size="${Math.max(13, Math.round(titleFontSize * 0.45))}" font-weight="500">${escapeXml(subtitleText)}</text>`
          );
        }
      }
    }

    slice.forEach((icon, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;

      const cellX = innerAreaX + c * (cellWidth + spacing);
      const cellY = innerAreaY + r * (cellHeight + spacing);

      const effectiveCellH = cellHeight - labelReserveH;
      const availableW = Math.max(12, cellWidth - safeCellMargin * 2);
      const availableH = Math.max(12, effectiveCellH - safeCellMargin * 2);

      const origW = Math.max(1, icon.originalWidth || 120);
      const origH = Math.max(1, icon.originalHeight || 120);

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

      const drawX = cellX + (cellWidth - drawWidth) / 2;
      const drawY = cellY + (effectiveCellH - drawHeight) / 2;

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

      // Render backing shape behind icon if enabled
      const shapeSvg = renderContainerShapeSvg(
        iconShape,
        cellX + cellWidth / 2,
        cellY + effectiveCellH / 2,
        cellWidth,
        effectiveCellH,
        shapeFillColor,
        shapeStrokeColor,
        shapeStrokeWidth
      );
      if (shapeSvg) {
        svgGroups.push(shapeSvg);
      }

      const innerMarkup = extractSvgInnerMarkup(icon.svgContent);
      const viewBox = extractSvgViewBox(icon.svgContent, origW, origH);

      svgGroups.push(
        `  <svg x="${drawX.toFixed(2)}" y="${drawY.toFixed(2)}" width="${drawWidth.toFixed(2)}" height="${drawHeight.toFixed(2)}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">\n    ${innerMarkup}\n  </svg>`
      );

      // Render per-icon label if enabled
      if (iconLabelMode !== 'none') {
        const globalNum = startIdx + i + 1;
        const labelStr =
          iconLabelMode === 'hash'
            ? `#${globalNum} Vector`
            : iconLabelMode === 'number'
            ? String(globalNum).padStart(2, '0')
            : icon.name.replace(/\.svg$/i, '');
        const lx = cellX + cellWidth / 2;
        const ly = cellY + cellHeight - 6;
        svgGroups.push(
          `  <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" fill="${iconLabelColor}" font-family="Inter, monospace, sans-serif" font-size="13" font-weight="600">${escapeXml(labelStr)}</text>`
        );
      }
    });

    if (showFooter && footerText) {
      const fy = canvasHeight - margin * 0.55;
      svgGroups.push(
        `  <line x1="${innerAreaX}" y1="${fy - 22}" x2="${canvasWidth - innerAreaX}" y2="${fy - 22}" stroke="#E2E8F0" stroke-width="1.5" />`,
        `  <text x="${canvasWidth / 2}" y="${fy}" text-anchor="middle" fill="${subtitleColor}" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="600" letter-spacing="0.05em">${escapeXml(footerText)}</text>`
      );
    }

    const sheetNumber = String(sheetIdx + 1).padStart(2, '0');
    const svgString = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">`,
      `  <rect width="${canvasWidth}" height="${canvasHeight}" fill="${canvasBgColor}" />`,
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

    if (
      p.drawX < 0 ||
      p.drawY < 0 ||
      p.drawX + p.drawWidth > canvasW + 0.5 ||
      p.drawY + p.drawHeight > canvasH + 0.5
    ) {
      insideCanvas = false;
      noCrop = false;
    }

    if (
      p.drawWidth > p.cellWidth - p.safeMargin + 0.5 ||
      p.drawHeight > p.cellHeight - p.safeMargin + 0.5
    ) {
      safeMargin = false;
    }

    const origRatio = p.icon.originalWidth / p.icon.originalHeight;
    const drawRatio = p.drawWidth / p.drawHeight;
    if (Math.abs(origRatio - drawRatio) > 0.02) {
      correctAspectRatio = false;
    }

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

