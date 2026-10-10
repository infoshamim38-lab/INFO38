import JSZip from 'jszip';
import { ExtractedIconItem, IconSheetPresentation } from '../../types/studio';

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  triggerBlobDownload(blob, filename);
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function triggerDataUrlDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadSvgFile(filename: string, svgContent: string) {
  const finalName = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  downloadTextFile(finalName, svgContent, 'image/svg+xml;charset=utf-8');
}

export async function downloadPngFromSvg(
  filename: string,
  svgContent: string,
  width = 1024,
  height = width
) {
  const finalName = filename.endsWith('.png') ? filename : `${filename}.png`;
  const blob = await renderSvgStringToRasterBlob(svgContent, width, height, 'png');
  triggerBlobDownload(blob, finalName);
}

export function downloadEpsFromSvg(filename: string, svgContent: string) {
  const finalName = filename.endsWith('.eps') ? filename : `${filename}.eps`;
  const epsHeader = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 2000 2000
%%Creator: SS SMART STUDIO Vector & Presentation Engine
%%Title: ${finalName}
%%EndComments
% SVG Vector Source Embedded:
`;
  const commentedSvg = svgContent
    .split('\n')
    .map((line) => `% ${line}`)
    .join('\n');
  const epsBody = `${epsHeader}${commentedSvg}\nshowpage\n%%EOF\n`;
  downloadTextFile(finalName, epsBody, 'application/postscript;charset=utf-8');
}

export function exportSingleSvg(icon: ExtractedIconItem) {
  downloadSvgFile(icon.name, icon.svgContent);
}

export async function exportIndividualSvgsAsZip(
  icons: ExtractedIconItem[],
  zipFilename = 'SS-SMART-STUDIO-INDIVIDUAL-ICONS.zip'
) {
  const zip = new JSZip();
  const folder = zip.folder('Icons');
  icons.forEach((icon) => {
    if (icon.svgContent) {
      const fileName = icon.name.endsWith('.svg') ? icon.name : `${icon.name}.svg`;
      folder?.file(fileName, icon.svgContent);
    }
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, zipFilename);
}

export async function exportAllVectorsZip(icons: ExtractedIconItem[]) {
  await exportIndividualSvgsAsZip(icons, 'SS-SMART-STUDIO-ALL-VECTORS.zip');
}

export function exportPresentationAsSvg(presentation: IconSheetPresentation) {
  const num = String(presentation.index).padStart(2, '0');
  downloadTextFile(`presentation-${num}.svg`, presentation.svgString, 'image/svg+xml;charset=utf-8');
}

export async function renderSvgStringToRasterBlob(
  svgString: string,
  width: number,
  height: number,
  format: 'png' | 'jpeg'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas raster export failed'));
        },
        format === 'png' ? 'image/png' : 'image/jpeg',
        0.95
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG into rasterizer'));
    };
    img.src = url;
  });
}

export async function exportPresentationAsRaster(
  presentation: IconSheetPresentation,
  format: 'png' | 'jpg'
) {
  const num = String(presentation.index).padStart(2, '0');
  const blob = await renderSvgStringToRasterBlob(
    presentation.svgString,
    presentation.canvasWidth,
    presentation.canvasHeight,
    format === 'png' ? 'png' : 'jpeg'
  );
  triggerBlobDownload(blob, `presentation-${num}.${format}`);
}

export async function exportAllPresentationsAsZip(
  presentations: IconSheetPresentation[],
  zipFilename = 'SS-SMART-STUDIO-ICON-SHEETS.zip'
) {
  const zip = new JSZip();
  const folder = zip.folder('Presentations');

  for (const p of presentations) {
    const num = String(p.index).padStart(2, '0');
    folder?.file(`presentation-${num}.svg`, p.svgString);
    try {
      const pngBlob = await renderSvgStringToRasterBlob(
        p.svgString,
        p.canvasWidth,
        p.canvasHeight,
        'png'
      );
      folder?.file(`presentation-${num}.png`, pngBlob);
    } catch {
      // SVG always included
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, zipFilename);
}

export async function exportFullStudioBundleZip(
  icons: ExtractedIconItem[],
  presentations: IconSheetPresentation[]
) {
  const zip = new JSZip();
  const iconsFolder = zip.folder('Single-Vectors-SVG');
  const sheetsFolder = zip.folder('Icon-Set-Presentations');

  for (const icon of icons) {
    if (icon.svgContent) {
      const name = icon.name.endsWith('.svg') ? icon.name : `${icon.name}.svg`;
      iconsFolder?.file(name, icon.svgContent);
    }
  }

  for (const p of presentations) {
    const num = String(p.index).padStart(2, '0');
    const svgStr = p.svgSheetContent || p.svgString;
    sheetsFolder?.file(`icon-set-presentation-${num}.svg`, svgStr);
    try {
      const pngBlob = await renderSvgStringToRasterBlob(
        svgStr,
        p.canvasWidth || 2000,
        p.canvasHeight || 2000,
        'png'
      );
      sheetsFolder?.file(`icon-set-presentation-${num}.png`, pngBlob);
    } catch {
      // SVG always included
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, 'SS-SMART-STUDIO-PRESENTATION-AND-VECTORS.zip');
}

export async function exportSmartFlowExtensionPackage() {
  const res = await fetch('/api/extension/files');
  const data = await res.json();
  const files: Record<string, string> = data.files || {};

  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }

  const base64Zip = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const a = document.createElement('a');
  a.href = `data:application/zip;base64,${base64Zip}`;
  a.download = 'SS-SMART-FLOW-EXTENSION-v4.5.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadWindowsInstallerBat() {
  const res = await fetch('/api/extension/files');
  const data = await res.json();
  const files: Record<string, string> = data.files || {};

  const lines: string[] = [
    '@echo off',
    'setlocal DisableDelayedExpansion',
    'cd /d "%~dp0"',
    'if exist "SS-SMART-FLOW-v4.5" rmdir /s /q "SS-SMART-FLOW-v4.5"',
    'mkdir "SS-SMART-FLOW-v4.5"',
    'cd "SS-SMART-FLOW-v4.5"',
  ];

  for (const [name, content] of Object.entries(files)) {
    const b64 = btoa(unescape(encodeURIComponent(content)));
    const chunks = b64.match(/.{1,64}/g) || [];
    lines.push(`if exist "${name}.b64" del "${name}.b64"`);
    for (let i = 0; i < chunks.length; i += 35) {
      const slice = chunks.slice(i, i + 35);
      lines.push('(');
      for (const chunk of slice) {
        lines.push(`echo ${chunk}`);
      }
      lines.push(`) >> "${name}.b64"`);
    }
    lines.push(`certutil -decode -f "${name}.b64" "${name}" >nul`);
    lines.push(`del "${name}.b64"`);
  }

  lines.push('echo.');
  lines.push('echo =====================================================');
  lines.push('echo SS SMART FLOW v4.5 folder created successfully!');
  lines.push('echo 1. Open chrome://extensions in Chrome');
  lines.push('echo 2. Click Load unpacked -> select this SS-SMART-FLOW-v4.5 folder');
  lines.push('echo =====================================================');
  lines.push('explorer .');
  lines.push('pause');

  const batContent = lines.join('\r\n');
  const b64Bat = btoa(unescape(encodeURIComponent(batContent)));
  const a = document.createElement('a');
  a.href = `data:application/octet-stream;base64,${b64Bat}`;
  a.download = 'INSTALL-SS-SMART-FLOW-v4.5.bat';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
