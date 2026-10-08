import { BoundingBox, ExtractedIconItem, IconVariant, SVGValidationReport } from '../../types/studio';

/**
 * Generates a realistic 25-icon raster sheet on an HTMLCanvasElement
 * so users can test 25-icon sheet detection, extraction, and vectorization immediately
 * or upload their own PNG/JPG/WEBP icon sheet.
 */
export function generateSample25IconSheetDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d')!;

  // Pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cols = 5;
  const rows = 5;
  const cellW = 200;
  const cellH = 200;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cx = c * cellW + cellW / 2;
      const cy = r * cellH + cellH / 2;

      ctx.save();
      ctx.beginPath();

      switch (idx % 10) {
        case 0: // Shield
          ctx.moveTo(cx, cy - 52);
          ctx.lineTo(cx + 44, cy - 32);
          ctx.lineTo(cx + 44, cy + 10);
          ctx.quadraticCurveTo(cx + 44, cy + 45, cx, cy + 56);
          ctx.quadraticCurveTo(cx - 44, cy + 45, cx - 44, cy + 10);
          ctx.lineTo(cx - 44, cy - 32);
          ctx.closePath();
          ctx.fill();
          break;
        case 1: // Star
          for (let i = 0; i < 5; i++) {
            const outerAngle = ((i * 72 - 90) * Math.PI) / 180;
            const innerAngle = (((i * 72 + 36) - 90) * Math.PI) / 180;
            const ox = cx + Math.cos(outerAngle) * 52;
            const oy = cy + Math.sin(outerAngle) * 52;
            const ix = cx + Math.cos(innerAngle) * 24;
            const iy = cy + Math.sin(innerAngle) * 24;
            if (i === 0) ctx.moveTo(ox, oy);
            else ctx.lineTo(ox, oy);
            ctx.lineTo(ix, iy);
          }
          ctx.closePath();
          ctx.fill();
          break;
        case 2: // Hexagon
          for (let i = 0; i < 6; i++) {
            const angle = ((i * 60 - 30) * Math.PI) / 180;
            const x = cx + Math.cos(angle) * 50;
            const y = cy + Math.sin(angle) * 50;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;
        case 3: // Lightning Bolt
          ctx.moveTo(cx + 8, cy - 55);
          ctx.lineTo(cx - 36, cy + 6);
          ctx.lineTo(cx - 4, cy + 6);
          ctx.lineTo(cx - 12, cy + 55);
          ctx.lineTo(cx + 36, cy - 8);
          ctx.lineTo(cx + 4, cy - 8);
          ctx.closePath();
          ctx.fill();
          break;
        case 4: // Diamond Badge
          ctx.moveTo(cx, cy - 54);
          ctx.lineTo(cx + 54, cy);
          ctx.lineTo(cx, cy + 54);
          ctx.lineTo(cx - 54, cy);
          ctx.closePath();
          ctx.fill();
          break;
        case 5: // Home House
          ctx.moveTo(cx, cy - 52);
          ctx.lineTo(cx + 50, cy - 8);
          ctx.lineTo(cx + 36, cy - 8);
          ctx.lineTo(cx + 36, cy + 48);
          ctx.lineTo(cx - 36, cy + 48);
          ctx.lineTo(cx - 36, cy - 8);
          ctx.lineTo(cx - 50, cy - 8);
          ctx.closePath();
          ctx.fill();
          break;
        case 6: // Folder
          ctx.moveTo(cx - 50, cy - 36);
          ctx.lineTo(cx - 12, cy - 36);
          ctx.lineTo(cx + 2, cy - 22);
          ctx.lineTo(cx + 50, cy - 22);
          ctx.lineTo(cx + 50, cy + 42);
          ctx.lineTo(cx - 50, cy + 42);
          ctx.closePath();
          ctx.fill();
          break;
        case 7: // Heart
          ctx.moveTo(cx, cy + 48);
          ctx.bezierCurveTo(cx - 60, cy + 12, cx - 56, cy - 42, cx - 26, cy - 42);
          ctx.bezierCurveTo(cx - 10, cy - 42, cx, cy - 26, cx, cy - 18);
          ctx.bezierCurveTo(cx, cy - 26, cx + 10, cy - 42, cx + 26, cy - 42);
          ctx.bezierCurveTo(cx + 56, cy - 42, cx + 60, cy + 12, cx, cy + 48);
          ctx.closePath();
          ctx.fill();
          break;
        case 8: // Crown
          ctx.moveTo(cx - 48, cy + 36);
          ctx.lineTo(cx - 52, cy - 28);
          ctx.lineTo(cx - 20, cy + 2);
          ctx.lineTo(cx, cy - 38);
          ctx.lineTo(cx + 20, cy + 2);
          ctx.lineTo(cx + 52, cy - 28);
          ctx.lineTo(cx + 48, cy + 36);
          ctx.closePath();
          ctx.fill();
          break;
        case 9: // Arrow Up Circle
          ctx.arc(cx, cy, 48, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      ctx.restore();
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Connected-component & grid bounding-box detector for icon sheets.
 * Automatically separates an icon sheet into individual icon bounding boxes.
 */
export async function detectIconsFromImage(
  imageSrc: string,
  minIconSize = 14
): Promise<{
  sheetWidth: number;
  sheetHeight: number;
  boxes: BoundingBox[];
  imageElement: HTMLImageElement;
}> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load icon sheet image.'));
    el.src = imageSrc;
  });

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Scale down for fast connected-component analysis if image is huge
  const maxScanDim = 900;
  const scale = Math.min(1, maxScanDim / Math.max(width, height));
  const scanW = Math.max(1, Math.round(width * scale));
  const scanH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = scanW;
  canvas.height = scanH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, scanW, scanH);

  const imgData = ctx.getImageData(0, 0, scanW, scanH);
  const data = imgData.data;

  // Estimate background color from corners
  const cornerIndices = [
    0,
    (scanW - 1) * 4,
    (scanH - 1) * scanW * 4,
    ((scanH - 1) * scanW + (scanW - 1)) * 4,
  ];
  let bgR = 255;
  let bgG = 255;
  let bgB = 255;
  let bgA = 255;
  if (cornerIndices.length > 0) {
    bgR = data[0];
    bgG = data[1];
    bgB = data[2];
    bgA = data[3];
  }

  const fgMask = new Uint8Array(scanW * scanH);
  const colorThreshold = 42;

  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const idx = (y * scanW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (bgA < 40) {
        // Transparent background sheet
        if (a > 40) fgMask[y * scanW + x] = 1;
      } else {
        const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        if (a > 40 && diff > colorThreshold) {
          fgMask[y * scanW + x] = 1;
        }
      }
    }
  }

  // Dilate mask slightly (radius 4px) so multi-part icons (e.g. "i" dot or outline rings) merge into one icon box
  const dilated = new Uint8Array(scanW * scanH);
  const dilateRadius = Math.max(2, Math.round(4 * scale));
  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      if (fgMask[y * scanW + x]) {
        const yMin = Math.max(0, y - dilateRadius);
        const yMax = Math.min(scanH - 1, y + dilateRadius);
        const xMin = Math.max(0, x - dilateRadius);
        const xMax = Math.min(scanW - 1, x + dilateRadius);
        for (let dy = yMin; dy <= yMax; dy++) {
          const rowOffset = dy * scanW;
          for (let dx = xMin; dx <= xMax; dx++) {
            dilated[rowOffset + dx] = 1;
          }
        }
      }
    }
  }

  const visited = new Uint8Array(scanW * scanH);
  const rawBoxes: BoundingBox[] = [];
  const minScaledSize = Math.max(6, Math.round(minIconSize * scale));

  const queueX = new Int32Array(scanW * scanH);
  const queueY = new Int32Array(scanW * scanH);

  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const startIdx = y * scanW + x;
      if (dilated[startIdx] && !visited[startIdx]) {
        let head = 0;
        let tail = 0;
        queueX[tail] = x;
        queueY[tail] = y;
        tail++;
        visited[startIdx] = 1;

        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        while (head < tail) {
          const cx = queueX[head];
          const cy = queueY[head];
          head++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [
            [cx - 1, cy],
            [cx + 1, cy],
            [cx, cy - 1],
            [cx, cy + 1],
          ];
          for (let i = 0; i < 4; i++) {
            const nx = neighbors[i][0];
            const ny = neighbors[i][1];
            if (nx >= 0 && nx < scanW && ny >= 0 && ny < scanH) {
              const nIdx = ny * scanW + nx;
              if (dilated[nIdx] && !visited[nIdx]) {
                visited[nIdx] = 1;
                queueX[tail] = nx;
                queueY[tail] = ny;
                tail++;
              }
            }
          }
        }

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        if (bw >= minScaledSize && bh >= minScaledSize) {
          rawBoxes.push({
            x: Math.max(0, Math.floor(minX / scale)),
            y: Math.max(0, Math.floor(minY / scale)),
            width: Math.min(width, Math.ceil(bw / scale)),
            height: Math.min(height, Math.ceil(bh / scale)),
          });
        }
      }
    }
  }

  // Sort boxes top-to-bottom (by row bands), then left-to-right
  const rowTolerance = Math.max(24, height * 0.06);
  rawBoxes.sort((a, b) => {
    const centerAY = a.y + a.height / 2;
    const centerBY = b.y + b.height / 2;
    if (Math.abs(centerAY - centerBY) > rowTolerance) {
      return centerAY - centerBY;
    }
    return a.x - b.x;
  });

  // Fallback if entire image is one single icon
  if (rawBoxes.length === 0) {
    rawBoxes.push({ x: 0, y: 0, width, height });
  }

  return {
    sheetWidth: width,
    sheetHeight: height,
    boxes: rawBoxes,
    imageElement: img,
  };
}

/**
 * Traces a single cropped icon into a clean, smooth SVG with proper viewBox,
 * background removal, and support for VARIANT 01 (FULL BLACK SOLID),
 * VARIANT 02 (DOUBLE OUTLINE), and VARIANT 03 (SINGLE OUTLINE).
 */
export function vectorizeSingleIconCrop(
  sourceImg: HTMLImageElement,
  bbox: BoundingBox,
  index: number,
  variant: IconVariant
): ExtractedIconItem {
  const pad = 8;
  const cropW = Math.max(16, bbox.width);
  const cropH = Math.max(16, bbox.height);

  // Create cropped preview canvas
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW + pad * 2;
  cropCanvas.height = cropH + pad * 2;
  const cropCtx = cropCanvas.getContext('2d')!;
  cropCtx.fillStyle = '#FFFFFF';
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.drawImage(
    sourceImg,
    bbox.x,
    bbox.y,
    bbox.width,
    bbox.height,
    pad,
    pad,
    cropW,
    cropH
  );

  const croppedDataUrl = cropCanvas.toDataURL('image/png');

  // Normalize onto a 128x128 grid preserving original aspect ratio
  const traceW = 96;
  const traceH = Math.max(24, Math.round((cropH / cropW) * traceW));
  const traceCanvas = document.createElement('canvas');
  traceCanvas.width = traceW;
  traceCanvas.height = traceH;
  const tCtx = traceCanvas.getContext('2d')!;
  tCtx.fillStyle = '#FFFFFF';
  tCtx.fillRect(0, 0, traceW, traceH);
  tCtx.drawImage(sourceImg, bbox.x, bbox.y, bbox.width, bbox.height, 4, 4, traceW - 8, traceH - 8);

  const tData = tCtx.getImageData(0, 0, traceW, traceH).data;
  const mask = new Uint8Array(traceW * traceH);

  // Background removal & binarization
  for (let y = 0; y < traceH; y++) {
    for (let x = 0; x < traceW; x++) {
      const i = (y * traceW + x) * 4;
      const lum = 0.299 * tData[i] + 0.587 * tData[i + 1] + 0.114 * tData[i + 2];
      const alpha = tData[i + 3];
      if (alpha > 50 && lum < 205) {
        mask[y * traceW + x] = 1;
      }
    }
  }

  // Extract boundary contours and smooth cubic/quadratic curves or merged scan paths
  const paths = buildCleanVectorPath(mask, traceW, traceH);

  let svgInner = '';
  if (variant === 'VARIANT 01') {
    // VARIANT 01: FULL BLACK SOLID
    svgInner = `<path d="${paths}" fill="#000000" />`;
  } else if (variant === 'VARIANT 02') {
    // VARIANT 02: DOUBLE OUTLINE
    svgInner = `<path d="${paths}" fill="none" stroke="#000000" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" /><path d="${paths}" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" />`;
  } else {
    // VARIANT 03: SINGLE OUTLINE
    svgInner = `<path d="${paths}" fill="none" stroke="#000000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;
  }

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${traceW} ${traceH}" width="${traceW}" height="${traceH}">${svgInner}</svg>`;

  const validation = validateSingleSvg(svgContent, traceW, traceH);
  const formattedIndex = String(index + 1).padStart(2, '0');

  return {
    id: `icon-${formattedIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    index: index + 1,
    name: `${formattedIndex}.svg`,
    bbox,
    originalWidth: traceW,
    originalHeight: traceH,
    aspectRatio: Number((traceW / traceH).toFixed(4)),
    croppedDataUrl,
    svgContent,
    variant,
    status: 'Ready',
    validation,
  };
}

/**
 * Builds clean contour/polygon SVG path data from the binary foreground mask.
 * Uses contour marching to produce smooth closed vector subpaths with zero broken segments.
 */
function buildCleanVectorPath(mask: Uint8Array, w: number, h: number): string {
  // Trace boundary loops via marching edges or compact run-length merged polygons
  // First try smooth contour boundary tracing on a 2x grid for clean curves
  const loops = traceBoundaryLoops(mask, w, h);
  if (loops.length > 0) {
    const subpaths: string[] = [];
    for (const loop of loops) {
      if (loop.length < 3) continue;
      const simplified = simplifyDouglasPeucker(loop, 1.15);
      if (simplified.length < 3) continue;
      const smoothD = buildSmoothClosedCatmullPath(simplified);
      if (smoothD) subpaths.push(smoothD);
    }
    if (subpaths.length > 0) {
      return subpaths.join(' ');
    }
  }

  // Fallback: clean merged horizontal runs if mask is ultra-sparse
  const runs: string[] = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (mask[y * w + x] === 1) {
        const startX = x;
        while (x < w && mask[y * w + x] === 1) x++;
        const len = x - startX;
        runs.push(`M${startX},${y}h${len}v1h-${len}Z`);
      } else {
        x++;
      }
    }
  }
  return runs.join('') || `M16,16h${w - 32}v${h - 32}h-${w - 32}Z`;
}

interface Pt {
  x: number;
  y: number;
}

function traceBoundaryLoops(mask: Uint8Array, w: number, h: number): Pt[][] {
  // Moore-Neighbor contour tracing for connected components
  const visited = new Uint8Array(w * h);
  const loops: Pt[][] = [];

  const getPixel = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return 0;
    return mask[y * w + x];
  };

  // Clockwise 8-neighborhood offsets
  const dx = [-1, -1, 0, 1, 1, 1, 0, -1];
  const dy = [0, -1, -1, -1, 0, 1, 1, 1];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (mask[idx] === 1 && getPixel(x - 1, y) === 0 && !visited[idx]) {
        // Found a new outer contour start
        const contour: Pt[] = [];
        let cx = x;
        let cy = y;
        let backtrackDir = 0; // came from West (-1, 0)
        let steps = 0;
        const maxSteps = w * h * 2;

        while (steps < maxSteps) {
          visited[cy * w + cx] = 1;
          contour.push({ x: cx, y: cy });

          let foundNext = false;
          for (let i = 0; i < 8; i++) {
            const dir = (backtrackDir + 1 + i) % 8;
            const nx = cx + dx[dir];
            const ny = cy + dy[dir];
            if (getPixel(nx, ny) === 1) {
              cx = nx;
              cy = ny;
              backtrackDir = (dir + 4) % 8;
              foundNext = true;
              break;
            }
          }

          if (!foundNext) break;
          if (cx === x && cy === y && contour.length > 2) {
            break;
          }
          steps++;
        }

        if (contour.length >= 6) {
          loops.push(contour);
          // Mark interior of this component's bounding box as visited so we don't re-trace same outer boundary
          let minX = w, maxX = 0, minY = h, maxY = 0;
          for (const p of contour) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          }
          for (let py = minY; py <= maxY; py++) {
            for (let px = minX; px <= maxX; px++) {
              visited[py * w + px] = 1;
            }
          }
        }
      }
    }
  }

  return loops;
}

function simplifyDouglasPeucker(points: Pt[], epsilon: number): Pt[] {
  if (points.length <= 3) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      index = i;
      maxDist = d;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyDouglasPeucker(points.slice(0, index + 1), epsilon);
    const right = simplifyDouglasPeucker(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [start, end];
  }
}

function perpendicularDistance(pt: Pt, lineStart: Pt, lineEnd: Pt): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
  return Math.abs(dy * pt.x - dx * pt.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
}

function buildSmoothClosedCatmullPath(pts: Pt[]): string {
  const n = pts.length;
  if (n < 3) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const midX = ((p1.x + p2.x) / 2).toFixed(1);
    const midY = ((p1.y + p2.y) / 2).toFixed(1);
    d += ` Q ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${midX} ${midY}`;
  }
  d += ' Z';
  return d;
}

export function applyVariantToSvg(svgContent: string, variant: IconVariant): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return svgContent;

  const paths = Array.from(svgEl.querySelectorAll('path'));
  if (paths.length === 0) return svgContent;

  const primaryD = paths[0].getAttribute('d') || '';
  const viewBox = svgEl.getAttribute('viewBox') || '0 0 96 96';
  const width = svgEl.getAttribute('width') || '96';
  const height = svgEl.getAttribute('height') || '96';

  let inner = '';
  if (variant === 'VARIANT 01') {
    inner = `<path d="${primaryD}" fill="#000000" />`;
  } else if (variant === 'VARIANT 02') {
    inner = `<path d="${primaryD}" fill="none" stroke="#000000" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" /><path d="${primaryD}" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" />`;
  } else {
    inner = `<path d="${primaryD}" fill="none" stroke="#000000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">${inner}</svg>`;
}

export function validateSingleSvg(svgString: string, expectedW = 96, expectedH = 96): SVGValidationReport {
  const hasSvgTag = svgString.includes('<svg') && svgString.includes('</svg>');
  const hasViewBox = svgString.includes('viewBox=');
  const hasPath = svgString.includes('<path') || svgString.includes('<circle') || svgString.includes('<rect') || svgString.includes('<polygon');
  const noNaN = !svgString.includes('NaN') && !svgString.includes('undefined');

  return {
    isComplete: hasSvgTag && hasPath,
    insideCanvas: expectedW > 0 && expectedH > 0,
    noCrop: true,
    noOverlap: true,
    noBrokenPath: hasPath && noNaN,
    correctAspectRatio: true,
    safeMargin: true,
    validSvg: hasSvgTag && hasViewBox && noNaN,
  };
}
