import { StructuredPromptResult } from '../../types/studio';

export interface GeminiConnectionResult {
  connected: boolean;
  model?: string;
  message?: string;
  error?: string;
}

export interface AnalyzeImageParams {
  imageBase64: string;
  mimeType: string;
  mode: string;
  promptStyle: string;
  detailLevel: string;
  model: string;
}

export interface PromptStudioParams {
  textInput: string;
  referenceImageBase64?: string;
  referenceMimeType?: string;
  category: string;
  style: string;
  variant: string;
  iconCount: number;
  model: string;
}

export interface PromptStudioResult {
  title: string;
  masterSheetPrompt: string;
  individualIconList: string[];
  technicalConstraints: string;
}

class GeminiServiceClass {
  async testKey(model = 'gemini-3.8-flash'): Promise<GeminiConnectionResult> {
    try {
      const response = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      const data = await response.json();
      if (!response.ok || !data.connected) {
        return {
          connected: false,
          error: data.error || 'Connection Failed',
        };
      }
      return {
        connected: true,
        model: data.model,
        message: data.message || 'Gemini Connected',
      };
    } catch (err: any) {
      return {
        connected: false,
        error: err?.message || 'Network problem',
      };
    }
  }

  async analyzeImage(params: AnalyzeImageParams): Promise<StructuredPromptResult> {
    const response = await fetch('/api/gemini/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!response.ok || !data.result) {
      throw new Error(data.error || 'Gemini Generation Failed');
    }
    return data.result as StructuredPromptResult;
  }

  async generatePrompt(params: PromptStudioParams): Promise<PromptStudioResult> {
    const response = await fetch('/api/gemini/prompt-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!response.ok || !data.result) {
      throw new Error(data.error || 'Gemini Prompt Studio Generation Failed');
    }
    return data.result as PromptStudioResult;
  }

  async generateIconPrompt(params: AnalyzeImageParams): Promise<StructuredPromptResult> {
    return this.analyzeImage({ ...params, mode: 'Icon Prompt' });
  }

  async generateVectorPrompt(params: AnalyzeImageParams): Promise<StructuredPromptResult> {
    return this.analyzeImage({ ...params, mode: 'Vector Prompt' });
  }

  async generateThumbnailPrompt(params: AnalyzeImageParams): Promise<StructuredPromptResult> {
    return this.analyzeImage({ ...params, mode: 'Thumbnail Prompt' });
  }
}

export const GeminiService = new GeminiServiceClass();
