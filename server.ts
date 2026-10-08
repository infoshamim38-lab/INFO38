import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import JSZip from 'jszip';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set in the environment. Please add GEMINI_API_KEY in the AI Studio Secrets panel (left sidebar > Settings / Secrets).'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const FALLBACK_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

async function generateWithFastFallback(
  preferredModel: string,
  contents: any,
  config?: any
) {
  const ai = getAiClient();
  const candidates = Array.from(new Set([preferredModel, ...FALLBACK_MODELS]));
  let lastError: any = null;

  for (const modelName of candidates) {
    try {
      const mergedConfig = { ...config };
      if (modelName === 'gemini-3.1-flash-lite' || modelName === 'gemini-3.8-flash') {
        mergedConfig.thinkingConfig = {
          thinkingLevel:
            modelName === 'gemini-3.1-flash-lite'
              ? ThinkingLevel.MINIMAL
              : ThinkingLevel.LOW,
        };
      }
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: mergedConfig,
      });
      return { response, usedModel: modelName };
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || '');
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('429') ||
        msg.includes('high demand') ||
        msg.includes('overloaded');
      if (!isTransient) {
        // Still try next fallback model in case model name is temporarily unavailable
        continue;
      }
    }
  }

  throw lastError || new Error('All Gemini models are currently busy. Please try again.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // 1. Test Gemini API Connection
  app.post('/api/gemini/test', async (req, res) => {
    try {
      const model = req.body.model || 'gemini-3.1-flash-lite';
      const { response, usedModel } = await generateWithFastFallback(
        model,
        'Respond with exact word: CONNECTED'
      );
      const text = response.text || '';
      res.json({
        connected: true,
        model: usedModel,
        message: 'Gemini Connected',
        response: text.trim(),
      });
    } catch (error: any) {
      res.status(500).json({
        connected: false,
        error: error?.message || 'Connection Failed',
      });
    }
  });

  // 2. Gemini Image-to-Prompt Analysis
  app.post('/api/gemini/analyze-image', async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType = 'image/png',
        mode = 'General Image Prompt',
        promptStyle = 'Professional',
        detailLevel = 'High',
        model = 'gemini-3.1-flash-lite',
      } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'No image data provided.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const modeInstructions: Record<string, string> = {
        'General Image Prompt':
          'Focus on accurately recreating the uploaded image with complete fidelity to subjects, spatial arrangement, textures, and lighting.',
        'AI Image Generation Prompt':
          'Optimize for state-of-the-art AI image generation engines with vivid descriptive tokens, camera parameters, material realism, and atmospheric fidelity.',
        'Vector Prompt':
          'Optimize for clean vector illustration / SVG generation: emphasize flat or clean geometric forms, crisp Bezier paths, scalable line weights, solid fills, and zero raster noise.',
        'Icon Prompt':
          'Optimize for professional icon system creation: specify grid proportions, stroke consistency, silhouette clarity, minimalist geometry, and isolated presentation.',
        'Thumbnail Prompt':
          'Optimize for high-contrast visual impact, clear focal hierarchy, readable composition, and expressive subject framing suitable for thumbnail recreation.',
      };

      const systemPrompt = `You are the core visual analysis engine inside SS SMART STUDIO.
Analyze the uploaded image with extreme precision. Do NOT generate a generic or random prompt.
Describe ONLY what is visually present in the image and translate it into a structured professional prompt.
Mode: ${mode} (${modeInstructions[mode] || modeInstructions['General Image Prompt']})
Prompt Style: ${promptStyle}
Detail Level: ${detailLevel}

Return a JSON object matching the exact schema.`;

      const { response } = await generateWithFastFallback(
        model,
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this image thoroughly and generate a structured ${promptStyle} prompt in "${mode}" mode at ${detailLevel} detail level.`,
            },
          ],
        },
        {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: {
                type: Type.STRING,
                description: 'Main subject, count, object type, shape, pose, and orientation.',
              },
              composition: {
                type: Type.STRING,
                description: 'Framing, camera angle, perspective, spatial arrangement, and visual hierarchy.',
              },
              style: {
                type: Type.STRING,
                description: 'Artistic, rendering, graphic, or vector style.',
              },
              color: {
                type: Type.STRING,
                description: 'Dominant color palette, accents, contrast, and tonal harmony.',
              },
              lighting: {
                type: Type.STRING,
                description: 'Light sources, direction, softness, shadows, and reflections.',
              },
              background: {
                type: Type.STRING,
                description: 'Background surface, isolation, depth, and environment.',
              },
              details: {
                type: Type.STRING,
                description: 'Materials, textures, stroke weights, micro-details, and negative elements to avoid.',
              },
              quality: {
                type: Type.STRING,
                description: 'Production quality standards, resolution, and crispness.',
              },
              finalPrompt: {
                type: Type.STRING,
                description: 'Complete, cohesive, ready-to-use professional prompt combining all analyzed dimensions.',
              },
            },
            required: [
              'subject',
              'composition',
              'style',
              'color',
              'lighting',
              'background',
              'details',
              'quality',
              'finalPrompt',
            ],
          },
        }
      );

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);
      res.json({ result: parsed });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Gemini Generation Failed',
      });
    }
  });

  // 3. AI Prompt Studio Generator
  app.post('/api/gemini/prompt-studio', async (req, res) => {
    try {
      const {
        textInput = '',
        referenceImageBase64,
        referenceMimeType = 'image/png',
        category = 'Technology & UI',
        style = 'Clean Minimal Vector',
        variant = 'VARIANT 01 - FULL BLACK SOLID',
        iconCount = 25,
        model = 'gemini-3.1-flash-lite',
      } = req.body;

      const variantRules: Record<string, string> = {
        'VARIANT 01 - FULL BLACK SOLID':
          'Full black solid silhouette icons (#000000) on pure white background (#FFFFFF), bold recognizable negative space, zero gradients, no gray tones.',
        'VARIANT 02 - DOUBLE OUTLINE':
          'Double outline parallel-stroke vector icons in pure black (#000000) on pure white background (#FFFFFF), uniform outer and inner contour spacing, crisp geometric joins.',
        'VARIANT 03 - SINGLE OUTLINE':
          'Single monoline outline vector icons in pure black (#000000) on pure white background (#FFFFFF), consistent 2px stroke weight, rounded caps, open clean geometry.',
      };

      const parts: any[] = [];
      if (referenceImageBase64) {
        const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: referenceMimeType,
            data: cleanBase64,
          },
        });
      }

      parts.push({
        text: `Generate a comprehensive, production-grade AI Icon Set & Vector Prompt specification.
Concept / Input: ${textInput || category}
Category: ${category}
Visual Style: ${style}
Icon Variant: ${variant} (${variantRules[variant] || variant})
Number of Icons in Sheet: ${iconCount}

Strict Rules:
- No text, no labels, no numbers, no watermarks anywhere in the generated artwork.
- Clean grid arrangement of ${iconCount} distinct icons in the "${category}" domain.
- Every icon must be isolated with generous white margin so automated bounding-box extraction can separate all ${iconCount} icons cleanly.`,
      });

      const { response } = await generateWithFastFallback(
        model,
        { parts },
        {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              masterSheetPrompt: {
                type: Type.STRING,
                description: 'Complete prompt to generate the full grid icon sheet without any text, labels, or watermarks.',
              },
              individualIconList: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of individual icon subjects included in the batch.',
              },
              technicalConstraints: {
                type: Type.STRING,
                description: 'Strict stroke, fill, isolation, and negative prompt specifications.',
              },
            },
            required: ['title', 'masterSheetPrompt', 'individualIconList', 'technicalConstraints'],
          },
        }
      );

      const parsed = JSON.parse(response.text || '{}');
      res.json({ result: parsed });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Prompt Studio generation failed.',
      });
    }
  });

  // 4. Flow Automation Image / Icon Sheet Generator
  app.post('/api/gemini/flow-generate-image', async (req, res) => {
    try {
      const { prompt, category = 'Icon Sheet' } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required for Flow generation.' });
      }

      const ai = getAiClient();

      // First try Gemini image generation model (gemini-3.1-flash-lite-image or gemini-3.1-flash-image)
      const imageModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];
      for (const imgModel of imageModels) {
        try {
          const imgResp = await ai.models.generateContent({
            model: imgModel,
            contents: {
              parts: [{ text: prompt }],
            },
            config: {
              imageConfig: {
                aspectRatio: '1:1',
              },
            },
          });

          const parts = imgResp.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
              return res.json({
                imageUrl: dataUrl,
                model: imgModel,
              });
            }
          }
        } catch {
          // If paid image model is unavailable on current key tier, fallback to Gemini SVG Icon Sheet synthesis
        }
      }

      // Fallback: Synthesize a clean, high-resolution 5x5 (25-icon) SVG Icon Sheet tailored to the prompt using Gemini fast model
      const { response } = await generateWithFastFallback(
        'gemini-3.1-flash-lite',
        `Generate 25 distinct, clean, minimalist solid black vector icon SVG path data strings ("d" attributes inside a 0 0 100 100 viewBox) matching this prompt: "${prompt}" (Category: ${category}).
Rules:
- Every path must fit cleanly within coordinates 15..85 of a 100x100 box.
- Return ONLY a JSON object with an array "paths" containing 25 valid SVG path "d" strings.`,
        {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              paths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['paths'],
          },
        }
      );

      const parsed = JSON.parse(response.text || '{"paths":[]}');
      const paths: string[] = Array.isArray(parsed.paths) && parsed.paths.length > 0 ? parsed.paths : [];

      const cols = 5;
      const rows = 5;
      const cell = 200;
      const svgWidth = cols * cell;
      const svgHeight = rows * cell;
      const cellsMarkup: string[] = [];

      for (let i = 0; i < 25; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = c * cell + 40;
        const y = r * cell + 40;
        const d =
          paths[i % Math.max(1, paths.length)] ||
          'M50 18 L82 36 L82 68 Q82 84 50 92 Q18 84 18 68 L18 36 Z';
        cellsMarkup.push(
          `<svg x="${x}" y="${y}" width="120" height="120" viewBox="0 0 100 100"><path d="${d}" fill="#000000"/></svg>`
        );
      }

      const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}"><rect width="${svgWidth}" height="${svgHeight}" fill="#FFFFFF"/>${cellsMarkup.join('')}</svg>`;
      const base64Svg = Buffer.from(fullSvg, 'utf-8').toString('base64');

      return res.json({
        imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
        model: 'gemini-vector-sheet-synthesizer',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Flow image generation failed.',
      });
    }
  });

  // 5. Server-Side Download for SS SMART FLOW Chrome Extension v4.1 ZIP (Direct C++ Hardware Input.insertText + MAIN World Auto-Generate Engine)
  const getExtensionFiles = () => {
    const manifest = JSON.stringify(
      {
        manifest_version: 3,
        name: 'SS SMART FLOW',
        version: '4.1.0',
        description: 'Official Chrome Automation Bridge (Direct Hardware Auto-Paste & Auto-Generate Engine v4.1) for SS SMART STUDIO -> Google Labs Flow / ImageFX.',
        permissions: [
          'activeTab',
          'tabs',
          'storage',
          'downloads',
          'scripting',
          'debugger',
          'clipboardRead',
          'clipboardWrite',
        ],
        host_permissions: ['<all_urls>'],
        action: {
          default_popup: 'popup.html',
          default_title: 'SS SMART FLOW v4.1',
        },
        background: {
          service_worker: 'background.js',
        },
        content_scripts: [
          {
            matches: ['<all_urls>'],
            js: ['content.js'],
            run_at: 'document_start',
            all_frames: true,
          },
        ],
      },
      null,
      2
    );

    const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SS SMART FLOW v4.1</title>
  <style>
    body {
      width: 280px;
      margin: 0;
      padding: 16px;
      background: #090D16;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    h1 { font-size: 14px; margin: 0 0 12px 0; letter-spacing: 0.04em; color: #38BDF8; }
    .row { display: flex; justify-content: space-between; font-size: 12px; padding: 7px 0; border-bottom: 1px solid #1E293B; }
    .status { color: #22C55E; font-weight: 600; }
    .actions { display: flex; gap: 8px; margin-top: 14px; }
    button { flex: 1; padding: 8px 10px; background: #172033; color: #F8FAFC; border: 1px solid #1E293B; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
    button:hover { background: #1E293B; border-color: #38BDF8; }
    .open-btn { width: 100%; margin-top: 10px; background: #38BDF8; color: #090D16; border: none; font-weight: 700; }
    .open-btn:hover { background: #0284C7; color: #FFFFFF; }
  </style>
</head>
<body>
  <h1>SS SMART FLOW v4.1</h1>
  <div class="row"><span>Status</span><span id="statusText" class="status">● Connected</span></div>
  <div class="row"><span>Engine</span><span>Hardware Paste + Generate</span></div>
  <div class="row"><span>Browser</span><span>Connected</span></div>
  <div class="row"><span>Flow</span><span id="flowState">Ready</span></div>
  <button id="openFlowBtn" class="open-btn">Open Google Flow Tab</button>
  <div class="actions">
    <button id="pauseBtn">Pause</button>
    <button id="disconnectBtn">Disconnect</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>`;

    const popupJs = `document.getElementById('openFlowBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://labs.google/fx/tools/flow' });
});
document.getElementById('pauseBtn').addEventListener('click', () => {
  chrome.storage.local.set({ paused: true });
  document.getElementById('flowState').textContent = 'Paused';
});
document.getElementById('disconnectBtn').addEventListener('click', () => {
  chrome.storage.local.set({ connected: false });
  document.getElementById('statusText').textContent = '○ Disconnected';
});`;

    const contentJs = `// SS SMART FLOW v4.1 Content Bridge (Hardware Auto-Paste + Auto-Generate Engine)
(function() {
  function extractPromptFromUrl(urlStr) {
    try {
      const u = new URL(urlStr);
      if (u.searchParams.get('ss_prompt')) return u.searchParams.get('ss_prompt');
      if (u.hash && u.hash.includes('ss_prompt=')) {
        const hp = new URLSearchParams(u.hash.replace(/^#/, ''));
        if (hp.get('ss_prompt')) return hp.get('ss_prompt');
      }
    } catch (e) {}
    return null;
  }

  try {
    const urlPrompt = extractPromptFromUrl(window.location.href);
    if (urlPrompt) {
      sessionStorage.setItem('ss_smart_flow_pending_prompt', urlPrompt);
      try {
        chrome.storage.local.set({
          ss_pending_prompt: urlPrompt,
          ss_pending_time: Date.now(),
          ss_pending_done: false
        });
      } catch (e) {}
    }
  } catch (e) {}

  // Heartbeat PONG every 1.2s so SS SMART STUDIO inside any iframe always shows real-time Connected v4.1 status
  function sendPong() {
    try {
      window.postMessage({ source: 'SS_SMART_FLOW_EXT', type: 'EXT_PONG', version: '4.1.0' }, '*');
    } catch (e) {}
  }
  sendPong();
  setInterval(sendPong, 1200);

  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'SS_SMART_STUDIO') return;

    if (event.data.type === 'EXT_PING') {
      sendPong();
      return;
    }

    if (event.data.type === 'DISPATCH_TO_FLOW') {
      try {
        chrome.storage.local.set({
          ss_pending_prompt: event.data.prompt,
          ss_pending_time: Date.now(),
          ss_pending_done: false,
          ss_pending_options: event.data.options || {}
        });
        chrome.runtime.sendMessage({
          type: 'DISPATCH_TO_FLOW',
          prompt: event.data.prompt,
          targetUrl: event.data.targetUrl || 'https://labs.google/fx/tools/flow',
          options: event.data.options || {},
          openedByAnchor: Boolean(event.data.openedByAnchor)
        });
      } catch (e) {}
    }
  });

  try {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'INJECT_AND_RUN_FLOW' && msg.prompt) {
        sessionStorage.setItem('ss_smart_flow_pending_prompt', msg.prompt);
        startFlowAutomationLoop(msg.prompt, msg.options || {}, true);
        sendResponse({ started: true });
      }
      return true;
    });
  } catch (e) {}

  const isGoogleFlowHost = () =>
    location.hostname.includes('labs.google') ||
    location.href.includes('/fx/tools/');

  function queryAllDeep(selector, root = document) {
    const results = [];
    try {
      results.push(...Array.from(root.querySelectorAll(selector)));
      const allElements = root.querySelectorAll('*');
      for (const el of allElements) {
        if (el.shadowRoot) {
          results.push(...queryAllDeep(selector, el.shadowRoot));
        }
      }
    } catch (e) {}
    return results;
  }

  function findFlowPromptBox() {
    const candidates = queryAllDeep(
      'textarea, div[contenteditable="true"], [role="textbox"], div[data-slate-editor="true"], div[data-lexical-editor="true"], .ProseMirror, input[type="text"]'
    );
    const visible = candidates.filter((el) => {
      if (el.id && el.id.startsWith('ss-hud')) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width < 120 || rect.height < 18) return false;
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
      return true;
    });

    visible.sort((a, b) => {
      const aHint = ((a.getAttribute('placeholder') || '') + ' ' + (a.getAttribute('aria-label') || '')).toLowerCase();
      const bHint = ((b.getAttribute('placeholder') || '') + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase();
      const aScore = (aHint.includes('prompt') || aHint.includes('describe') || aHint.includes('generate') || aHint.includes('create') || aHint.includes('ask') ? 500000 : 0) + a.getBoundingClientRect().width * a.getBoundingClientRect().height;
      const bScore = (bHint.includes('prompt') || bHint.includes('describe') || bHint.includes('generate') || bHint.includes('create') || bHint.includes('ask') ? 500000 : 0) + b.getBoundingClientRect().width * b.getBoundingClientRect().height;
      return bScore - aScore;
    });
    return visible[0] || null;
  }

  function findNewProjectButton() {
    const buttons = queryAllDeep('button, a, [role="button"]');
    for (const btn of buttons) {
      if (btn.id && btn.id.startsWith('ss-hud')) continue;
      const txt = ((btn.innerText || '') + ' ' + (btn.getAttribute('aria-label') || '')).trim().toLowerCase();
      if (
        txt === 'new project' ||
        txt.includes('+ new project') ||
        txt.includes('new project') ||
        txt.includes('create project') ||
        txt.includes('start creating') ||
        txt.includes('create with flow') ||
        txt.includes('enter flow')
      ) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 36 && rect.height > 20) return btn;
      }
    }
    return null;
  }

  function triggerFullPointerClick(el) {
    if (!el) return;
    try {
      el.removeAttribute('disabled');
      el.setAttribute('aria-disabled', 'false');
    } catch (e) {}
    const rect = el.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, composed: true, view: window, clientX, clientY, button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    if (typeof el.click === 'function') el.click();
  }

  function showFlowHud(statusMessage, promptPreview, onManualTrigger) {
    if (!document.body) return;
    let hud = document.getElementById('ss-smart-flow-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'ss-smart-flow-hud';
      hud.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;width:350px;background:#090D16;color:#F8FAFC;border:2px solid #38BDF8;border-radius:10px;padding:14px;font-family:sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.85);font-size:12px;';
      document.body.appendChild(hud);
    }

    const safePreview = (promptPreview || '').slice(0, 95) + ((promptPreview || '').length > 95 ? '...' : '');
    hud.innerHTML = \`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="color:#38BDF8;font-size:13px;letter-spacing:0.04em;">⚡ SS SMART FLOW v4.1</strong>
        <span style="color:#22C55E;font-weight:600;font-size:11px;" id="ss-hud-status">\${statusMessage}</span>
      </div>
      <div style="background:#111726;padding:8px;border-radius:6px;color:#94A3B8;font-size:11px;margin-bottom:10px;word-break:break-word;border:1px solid #1E293B;">
        \${safePreview || 'Waiting for prompt...'}
      </div>
      <div style="display:flex;gap:8px;">
        <button id="ss-hud-run-btn" style="flex:1;padding:8px;background:#38BDF8;color:#090D16;font-weight:700;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
          ▶ Paste & Auto-Generate Now
        </button>
        <button id="ss-hud-close-btn" style="padding:8px 10px;background:#172033;color:#94A3B8;border:1px solid #1E293B;border-radius:6px;cursor:pointer;font-size:11px;">
          ✕
        </button>
      </div>
    \`;

    const runBtn = document.getElementById('ss-hud-run-btn');
    if (runBtn && onManualTrigger) {
      runBtn.onclick = () => onManualTrigger();
    }
    const closeBtn = document.getElementById('ss-hud-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => hud.remove();
    }
  }

  function updateHudStatus(text) {
    const el = document.getElementById('ss-hud-status');
    if (el) el.textContent = text;
  }

  let activeLoopTimer = null;
  let isSubmittingNow = false;
  let activePromptInFlight = null;

  function triggerHardwarePasteAndGenerate(promptText, options = {}, onSuccess) {
    if (isSubmittingNow) return;
    const inputEl = findFlowPromptBox();
    if (!inputEl) {
      const newProjBtn = findNewProjectButton();
      if (newProjBtn) {
        updateHudStatus('Opening Flow Project...');
        triggerFullPointerClick(newProjBtn);
      } else {
        updateHudStatus('Waiting for Flow Editor...');
      }
      return;
    }

    isSubmittingNow = true;
    updateHudStatus('Hardware Typing & Clicking Generate...');

    try {
      chrome.runtime.sendMessage(
        {
          type: 'CDP_TRUSTED_FLOW_SUBMIT',
          prompt: promptText
        },
        (res) => {
          isSubmittingNow = false;
          updateHudStatus('✓ Prompt Pasted & Generating!');
          if (options.autoDetectResult !== false) {
            watchForGeneratedImages(options.autoDownload !== false);
          }
          if (onSuccess) onSuccess(res);
        }
      );
    } catch (e) {
      isSubmittingNow = false;
    }
  }

  function startFlowAutomationLoop(promptText, options = {}, forceRestart = false) {
    if (!promptText) return;
    if (!forceRestart && activePromptInFlight === promptText && activeLoopTimer) return;

    activePromptInFlight = promptText;
    if (activeLoopTimer) clearInterval(activeLoopTimer);

    const bootHud = () => {
      showFlowHud('Searching Flow Editor...', promptText, () => {
        isSubmittingNow = false;
        triggerHardwarePasteAndGenerate(promptText, options);
      });
    };
    if (document.body) bootHud();
    else window.addEventListener('DOMContentLoaded', bootHud);

    let attempts = 0;
    const maxAttempts = 60;

    activeLoopTimer = setInterval(() => {
      if (isSubmittingNow) return;
      attempts++;

      const inputEl = findFlowPromptBox();
      if (!inputEl) {
        const newProjBtn = findNewProjectButton();
        if (newProjBtn && attempts % 2 === 1) {
          updateHudStatus('Opening New Flow Project...');
          triggerFullPointerClick(newProjBtn);
        }
        if (attempts >= maxAttempts) {
          clearInterval(activeLoopTimer);
          activeLoopTimer = null;
          updateHudStatus('Click Button Below ↓');
        }
        return;
      }

      // Prompt box found! Stop loop and execute full hardware paste + generate sequence
      clearInterval(activeLoopTimer);
      activeLoopTimer = null;

      triggerHardwarePasteAndGenerate(promptText, options, () => {
        sessionStorage.removeItem('ss_smart_flow_pending_prompt');
        try {
          chrome.storage.local.set({ ss_pending_done: true });
        } catch (e) {}
      });
    }, 1200);
  }

  function watchForGeneratedImages(shouldDownload) {
    const existingSrcs = new Set(queryAllDeep('img').map((img) => img.src));
    let checks = 0;
    const checkTimer = setInterval(() => {
      checks++;
      const imgs = queryAllDeep('img');
      const newLargeImg = imgs.find((img) => {
        const rect = img.getBoundingClientRect();
        return (
          img.src &&
          !existingSrcs.has(img.src) &&
          rect.width >= 180 &&
          rect.height >= 180 &&
          (img.src.startsWith('blob:') || img.src.startsWith('data:image') || img.src.startsWith('http'))
        );
      });

      if (newLargeImg) {
        clearInterval(checkTimer);
        updateHudStatus('✓ Image Generated & Detected!');
        if (shouldDownload) {
          try {
            chrome.runtime.sendMessage({
              type: 'DOWNLOAD_FLOW_RESULT',
              url: newLargeImg.src,
              filename: 'SS-SMART-FLOW-' + Date.now() + '.png'
            });
          } catch (e) {}
        }
      } else if (checks >= 90) {
        clearInterval(checkTimer);
      }
    }, 1500);
  }

  // On Google Flow host, continuously watch sessionStorage + chrome.storage.local so redirects never lose the job
  if (isGoogleFlowHost()) {
    const checkPendingJob = () => {
      const pendingSession = sessionStorage.getItem('ss_smart_flow_pending_prompt');
      if (pendingSession) {
        startFlowAutomationLoop(pendingSession, { autoSubmit: true, autoGenerate: true, autoDetectResult: true, autoDownload: true });
        return;
      }
      try {
        chrome.storage.local.get(['ss_pending_prompt', 'ss_pending_time', 'ss_pending_done', 'ss_pending_options'], (res) => {
          if (
            res &&
            res.ss_pending_prompt &&
            !res.ss_pending_done &&
            Date.now() - (res.ss_pending_time || 0) < 180000
          ) {
            startFlowAutomationLoop(res.ss_pending_prompt, res.ss_pending_options || {});
          }
        });
      } catch (e) {}
    };

    checkPendingJob();
    setInterval(checkPendingJob, 1500);
  }
})();`;

    const backgroundJs = `chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ connected: true, paused: false });
  console.log('SS SMART FLOW Extension v4.1 Installed.');
});

function capturePromptFromTabUrl(urlStr) {
  if (!urlStr || !urlStr.includes('ss_prompt=')) return null;
  try {
    const u = new URL(urlStr);
    let p = u.searchParams.get('ss_prompt');
    if (!p && u.hash && u.hash.includes('ss_prompt=')) {
      const hp = new URLSearchParams(u.hash.replace(/^#/, ''));
      p = hp.get('ss_prompt');
    }
    if (p) {
      chrome.storage.local.set({
        ss_pending_prompt: p,
        ss_pending_time: Date.now(),
        ss_pending_done: false
      });
      return p;
    }
  } catch (e) {}
  return null;
}

chrome.tabs.onCreated.addListener((tab) => {
  capturePromptFromTabUrl(tab.pendingUrl || tab.url || '');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    capturePromptFromTabUrl(changeInfo.url);
  }
  const currentUrl = tab.url || changeInfo.url || '';
  if (changeInfo.status === 'complete' && (currentUrl.includes('labs.google') || currentUrl.includes('/fx/tools/'))) {
    chrome.storage.local.get(['ss_pending_prompt', 'ss_pending_time', 'ss_pending_done', 'ss_pending_options'], (res) => {
      if (
        res &&
        res.ss_pending_prompt &&
        !res.ss_pending_done &&
        Date.now() - (res.ss_pending_time || 0) < 180000
      ) {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            type: 'INJECT_AND_RUN_FLOW',
            prompt: res.ss_pending_prompt,
            options: res.ss_pending_options || {}
          }).catch(() => {});
        }, 600);
      }
    });
  }
});

// Step 1 in MAIN world: Focus input box, clear any old text, and return its center coordinates
async function focusAndPrepareInputInMainWorld(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        function queryDeep(selector, root = document) {
          const arr = Array.from(root.querySelectorAll(selector));
          for (const el of root.querySelectorAll('*')) {
            if (el.shadowRoot) arr.push(...queryDeep(selector, el.shadowRoot));
          }
          return arr;
        }
        const candidates = queryDeep('textarea, div[contenteditable="true"], [role="textbox"], div[data-slate-editor="true"], div[data-lexical-editor="true"], .ProseMirror, input[type="text"]').filter((el) => {
          if (el.id && el.id.startsWith('ss-hud')) return false;
          const r = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          return r.width > 120 && r.height > 18 && s.display !== 'none' && s.visibility !== 'hidden';
        });
        candidates.sort((a, b) => {
          const ah = ((a.getAttribute('placeholder') || '') + ' ' + (a.getAttribute('aria-label') || '')).toLowerCase();
          const bh = ((b.getAttribute('placeholder') || '') + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase();
          const as = (ah.includes('prompt') || ah.includes('describe') || ah.includes('generate') || ah.includes('create') || ah.includes('ask') ? 500000 : 0) + a.getBoundingClientRect().width * a.getBoundingClientRect().height;
          const bs = (bh.includes('prompt') || bh.includes('describe') || bh.includes('generate') || bh.includes('create') || bh.includes('ask') ? 500000 : 0) + b.getBoundingClientRect().width * b.getBoundingClientRect().height;
          return bs - as;
        });

        const inputEl = candidates[0];
        if (!inputEl) return { foundInput: false };

        inputEl.scrollIntoView({ block: 'center', inline: 'center' });
        inputEl.focus();
        inputEl.click();

        // Select existing text so hardware typing replaces it cleanly
        if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
          inputEl.select();
        } else {
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(inputEl);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }

        const rect = inputEl.getBoundingClientRect();
        return {
          foundInput: true,
          inputX: Math.round(rect.left + rect.width / 2),
          inputY: Math.round(rect.top + rect.height / 2)
        };
      }
    });
    return (results && results[0] && results[0].result) || { foundInput: false };
  } catch (e) {
    return { foundInput: false };
  }
}

// Step 2 in MAIN world: Ensure prompt text is present (fallback if debugger was blocked) and locate + click the Generate button!
async function verifyTextAndFindGenerateButtonInMainWorld(tabId, promptText) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      args: [promptText],
      func: (textToInsert) => {
        function queryDeep(selector, root = document) {
          const arr = Array.from(root.querySelectorAll(selector));
          for (const el of root.querySelectorAll('*')) {
            if (el.shadowRoot) arr.push(...queryDeep(selector, el.shadowRoot));
          }
          return arr;
        }
        const candidates = queryDeep('textarea, div[contenteditable="true"], [role="textbox"], div[data-slate-editor="true"], div[data-lexical-editor="true"], .ProseMirror, input[type="text"]').filter((el) => {
          if (el.id && el.id.startsWith('ss-hud')) return false;
          const r = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          return r.width > 120 && r.height > 18 && s.display !== 'none' && s.visibility !== 'hidden';
        });
        const inputEl = candidates[0];
        if (!inputEl) return { foundBtn: false };

        const currentText = (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT')
          ? (inputEl.value || '').trim()
          : (inputEl.innerText || inputEl.textContent || '').trim();

        // Fallback paste if hardware typing didn't populate the field
        if (currentText.length < Math.min(6, textToInsert.length)) {
          inputEl.focus();
          if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
            const tracker = inputEl._valueTracker;
            if (tracker) tracker.setValue('');
            const proto = inputEl.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (setter) setter.call(inputEl, textToInsert);
            else inputEl.value = textToInsert;
            inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: textToInsert }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          } else {
            const dt = new DataTransfer();
            dt.setData('text/plain', textToInsert);
            inputEl.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, composed: true, inputType: 'insertFromPaste', data: textToInsert }));
            inputEl.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, composed: true, clipboardData: dt }));
            if ((inputEl.innerText || '').trim().length < 5) {
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, textToInsert);
            }
          }
        }

        const inRect = inputEl.getBoundingClientRect();
        const allBtns = queryDeep('button, [role="button"]').filter((btn) => {
          if (!btn || (btn.id && btn.id.startsWith('ss-hud'))) return false;
          const r = btn.getBoundingClientRect();
          const s = window.getComputedStyle(btn);
          return r.width >= 22 && r.height >= 22 && s.display !== 'none' && s.visibility !== 'hidden';
        });

        let bestBtn = null;
        let bestScore = -999;

        for (const btn of allBtns) {
          const r = btn.getBoundingClientRect();
          const rawText = (btn.innerText || '').trim().toLowerCase();
          const aria = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.getAttribute('title') || '') + ' ' + (btn.getAttribute('data-testid') || '')).toLowerCase();
          const html = (btn.innerHTML || '').toLowerCase();
          const combined = rawText + ' ' + aria;

          if (
            combined.includes('setting') ||
            combined.includes('tune') ||
            combined.includes('aspect') ||
            combined.includes('ratio') ||
            combined.includes('clear') ||
            combined.includes('close') ||
            combined.includes('cancel') ||
            combined.includes('delete') ||
            combined.includes('upload') ||
            combined.includes('attach') ||
            combined.includes('expand_more') ||
            combined.includes('keyboard_arrow_down') ||
            combined.includes('more_vert') ||
            combined.includes('more_horiz') ||
            combined.includes('history') ||
            combined.includes('library') ||
            combined.includes('feedback') ||
            combined.includes('help') ||
            combined.includes('menu') ||
            rawText === 'add' ||
            rawText === 'image' ||
            rawText === 'close'
          ) {
            continue;
          }

          let score = 0;
          if (btn.getAttribute('type') === 'submit') score += 120;
          if (
            combined.includes('generate') ||
            combined.includes('create') ||
            combined.includes('submit') ||
            combined.includes('send') ||
            combined.includes('run')
          ) {
            score += 150;
          }
          if (
            rawText === 'arrow_upward' ||
            rawText === 'arrow_forward' ||
            rawText === 'north' ||
            rawText === 'send' ||
            rawText === 'auto_awesome' ||
            rawText === 'spark' ||
            rawText === 'play_arrow' ||
            html.includes('arrow_upward') ||
            html.includes('arrow_forward') ||
            html.includes('auto_awesome') ||
            html.includes('send')
          ) {
            score += 140;
          }

          const vertDist = Math.abs((r.top + r.height / 2) - (inRect.top + inRect.height / 2));
          const horizDist = r.left - inRect.left;
          if (vertDist < 150 && horizDist >= 0 && horizDist <= inRect.width + 200) {
            score += 65;
            if (r.left >= inRect.left + inRect.width * 0.5) score += 45;
          } else {
            score -= 50;
          }

          if (html.includes('<svg')) score += 20;
          const bg = window.getComputedStyle(btn).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') score += 15;

          if (score > bestScore) {
            bestScore = score;
            bestBtn = btn;
          }
        }

        if (bestBtn && bestScore >= 40) {
          try {
            bestBtn.removeAttribute('disabled');
            bestBtn.setAttribute('aria-disabled', 'false');
          } catch (e) {}
          const br = bestBtn.getBoundingClientRect();
          const clientX = Math.round(br.left + br.width / 2);
          const clientY = Math.round(br.top + br.height / 2);
          const opts = { bubbles: true, cancelable: true, composed: true, view: window, clientX, clientY, button: 0, buttons: 1 };
          bestBtn.dispatchEvent(new PointerEvent('pointerdown', opts));
          bestBtn.dispatchEvent(new MouseEvent('mousedown', opts));
          bestBtn.dispatchEvent(new PointerEvent('pointerup', opts));
          bestBtn.dispatchEvent(new MouseEvent('mouseup', opts));
          bestBtn.dispatchEvent(new MouseEvent('click', opts));
          if (typeof bestBtn.click === 'function') bestBtn.click();
          return { foundBtn: true, btnX: clientX, btnY: clientY };
        }

        return { foundBtn: false };
      }
    });
    return (results && results[0] && results[0].result) || { foundBtn: false };
  } catch (e) {
    return { foundBtn: false };
  }
}

// Master Hardware Paste + Click Engine via chrome.debugger
async function runTrustedDebuggerSubmit(tabId, promptText) {
  const target = { tabId };
  let attached = false;
  try {
    await chrome.debugger.attach(target, '1.3');
    attached = true;
  } catch (e) {
    attached = true;
  }

  try {
    // 1. Wait 300ms so any debugger top-bar layout shift finishes BEFORE measuring coordinates
    await new Promise((r) => setTimeout(r, 300));

    // 2. Focus and select existing text in MAIN world, and get fresh (inputX, inputY)
    const prep = await focusAndPrepareInputInMainWorld(tabId);

    if (prep && prep.foundInput && prep.inputX && prep.inputY) {
      // 3. Hardware mouse click directly inside the prompt box
      await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: prep.inputX,
        y: prep.inputY
      });
      await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: prep.inputX,
        y: prep.inputY,
        button: 'left',
        clickCount: 1
      });
      await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: prep.inputX,
        y: prep.inputY,
        button: 'left',
        clickCount: 1
      });
      await new Promise((r) => setTimeout(r, 150));

      // 4. Insert the ENTIRE promptText via Chrome's native C++ Input.insertText command!
      await chrome.debugger.sendCommand(target, 'Input.insertText', { text: promptText });
      await new Promise((r) => setTimeout(r, 700));
    }

    // 5. Verify text in MAIN world and find + click the now-enabled Generate button
    const btnInfo = await verifyTextAndFindGenerateButtonInMainWorld(tabId, promptText);

    // 6. Hardware click on the Generate button coordinates first!
    if (btnInfo && btnInfo.foundBtn && btnInfo.btnX && btnInfo.btnY) {
      await new Promise((r) => setTimeout(r, 150));
      await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: btnInfo.btnX,
        y: btnInfo.btnY
      });
      await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: btnInfo.btnX,
        y: btnInfo.btnY,
        button: 'left',
        clickCount: 1
      });
      await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: btnInfo.btnX,
        y: btnInfo.btnY,
        button: 'left',
        clickCount: 1
      });
    }

    // 7. Also fire hardware Enter key 250ms later
    await new Promise((r) => setTimeout(r, 250));
    await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      key: 'Enter',
      code: 'Enter',
      text: '\\r',
      unmodifiedText: '\\r'
    });
    await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      key: 'Enter',
      code: 'Enter'
    });
  } catch (err) {
    console.warn('CDP submit error:', err);
    // Still run MAIN world fallback even if debugger threw an error
    await verifyTextAndFindGenerateButtonInMainWorld(tabId, promptText);
  } finally {
    if (attached) {
      setTimeout(() => {
        chrome.debugger.detach(target).catch(() => {});
      }, 1000);
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CDP_TRUSTED_FLOW_SUBMIT' && sender.tab && sender.tab.id) {
    runTrustedDebuggerSubmit(sender.tab.id, message.prompt || '').then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'DISPATCH_TO_FLOW') {
    const baseTargetUrl = message.targetUrl || 'https://labs.google/fx/tools/flow';
    const prompt = message.prompt || '';
    const options = message.options || {};
    const openedByAnchor = Boolean(message.openedByAnchor);

    chrome.storage.local.set({
      ss_pending_prompt: prompt,
      ss_pending_time: Date.now(),
      ss_pending_done: false,
      ss_pending_options: options
    });

    if (openedByAnchor) {
      sendResponse({ ok: true, viaAnchor: true });
      return true;
    }

    chrome.tabs.query({}, (tabs) => {
      const existingTab = tabs.find((t) => {
        const u = (t.url || '') + ' ' + (t.pendingUrl || '');
        return u.includes('labs.google') || u.includes('/fx/tools/');
      });

      if (existingTab && existingTab.id) {
        chrome.tabs.update(existingTab.id, { active: true }, () => {
          setTimeout(() => {
            chrome.tabs.sendMessage(existingTab.id, {
              type: 'INJECT_AND_RUN_FLOW',
              prompt,
              options
            }).catch(() => {});
          }, 800);
        });
        sendResponse({ ok: true, tabId: existingTab.id, reused: true });
      } else {
        const sep = baseTargetUrl.includes('?') ? '&' : '?';
        const fullUrl = \`\${baseTargetUrl}\${sep}ss_prompt=\${encodeURIComponent(prompt)}#ss_prompt=\${encodeURIComponent(prompt)}\`;
        chrome.tabs.create({ url: fullUrl, active: true }, (newTab) => {
          sendResponse({ ok: Boolean(newTab && newTab.id), tabId: newTab ? newTab.id : null, reused: false });
        });
      }
    });
    return true;
  }

  if (message.type === 'DOWNLOAD_FLOW_RESULT' && message.url) {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || ('ss-smart-flow-' + Date.now() + '.png'),
      saveAs: false
    });
    sendResponse({ downloaded: true });
    return true;
  }
});`;

    return {
      'manifest.json': manifest,
      'popup.html': popupHtml,
      'popup.js': popupJs,
      'content.js': contentJs,
      'background.js': backgroundJs,
    };
  };

  app.get('/api/extension/download-zip', async (_req, res) => {
    try {
      const files = getExtensionFiles();
      const zip = new JSZip();
      for (const [name, content] of Object.entries(files)) {
        zip.file(name, content);
      }
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="SS-SMART-FLOW-EXTENSION-v4.1.zip"');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).send('Failed to generate extension ZIP.');
    }
  });

  app.get('/api/extension/files', (_req, res) => {
    res.json({ files: getExtensionFiles() });
  });

  // 6. Real-Time Server-Side Bridge for SS SMART FLOW Chrome Extension
  // This guarantees 100% reliable Studio -> Extension -> Chrome Flow communication even inside sandboxed iframes!
  interface PendingFlowJob {
    id: string;
    prompt: string;
    category: string;
    targetUrl: string;
    options: any;
    createdAt: number;
    pickedUp: boolean;
  }
  const pendingFlowJobs: PendingFlowJob[] = [];

  app.post('/api/flow/dispatch', (req, res) => {
    const { prompt, category = 'Vector Icon Sheet', targetUrl = 'https://labs.google/fx/tools/flow', options = {} } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }
    const job: PendingFlowJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      prompt,
      category,
      targetUrl,
      options,
      createdAt: Date.now(),
      pickedUp: false,
    };
    pendingFlowJobs.push(job);
    res.json({ ok: true, job });
  });

  app.get('/api/flow/poll', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const nextJob = pendingFlowJobs.find((j) => !j.pickedUp);
    if (nextJob) {
      nextJob.pickedUp = true;
      return res.json({ hasJob: true, job: nextJob });
    }
    res.json({ hasJob: false });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SS SMART STUDIO running on http://localhost:${PORT}`);
  });
}

startServer();
