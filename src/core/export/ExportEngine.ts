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

export function exportSingleSvg(icon: ExtractedIconItem) {
  downloadTextFile(icon.name, icon.svgContent, 'image/svg+xml;charset=utf-8');
}

export async function exportIndividualSvgsAsZip(icons: ExtractedIconItem[], zipFilename = 'SS-SMART-STUDIO-INDIVIDUAL-ICONS.zip') {
  const zip = new JSZip();
  const folder = zip.folder('Icons');
  icons.forEach((icon) => {
    folder?.file(icon.name, icon.svgContent);
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, zipFilename);
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
      const pngBlob = await renderSvgStringToRasterBlob(p.svgString, p.canvasWidth, p.canvasHeight, 'png');
      folder?.file(`presentation-${num}.png`, pngBlob);
    } catch {
      // SVG always included
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, zipFilename);
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
  a.download = 'SS-SMART-FLOW-EXTENSION-v4.1.zip';
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
    'if exist "SS-SMART-FLOW-v4.1" rmdir /s /q "SS-SMART-FLOW-v4.1"',
    'mkdir "SS-SMART-FLOW-v4.1"',
    'cd "SS-SMART-FLOW-v4.1"',
  ];

  // Wrap Base64 at 64 chars per line so Windows cmd.exe NEVER hits the 8,191-char line limit!
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
  lines.push('echo SS SMART FLOW v4.1 folder created successfully!');
  lines.push('echo 1. Open chrome://extensions in Chrome');
  lines.push('echo 2. Click Load unpacked -> select this SS-SMART-FLOW-v4.1 folder');
  lines.push('echo =====================================================');
  lines.push('explorer .');
  lines.push('pause');

  const batContent = lines.join('\r\n');
  const b64Bat = btoa(unescape(encodeURIComponent(batContent)));
  const a = document.createElement('a');
  a.href = `data:application/octet-stream;base64,${b64Bat}`;
  a.download = 'INSTALL-SS-SMART-FLOW-v4.1.bat';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
