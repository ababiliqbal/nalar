import 'server-only';

import { GoogleGenAI } from '@google/genai';

import {
  getGeminiKeyPool,
  type IGeminiKeyPool,
} from '@/lib/ai/gemini-pool';
import { buildAutoHintPrompt } from '@/lib/ai/prompt-builder';
import type {
  MissionDefinition,
  MissionStage,
  ScaffoldingLevelCode,
} from '@/lib/types/domain';

const DEFAULT_FALLBACK_HINT =
  'Coba tinjau kembali langkah terakhirmu dan pastikan sudah sesuai dengan aturan pada studi kasus.';
const MAX_HINT_CHARS = 280;

export interface GenerateAutoHintInput {
  mission: MissionDefinition;
  stage: MissionStage;
  level: ScaffoldingLevelCode;
  currentInput: string;
  pool?: IGeminiKeyPool;
}

export interface GenerateAutoHintResult {
  hint: string;
  source: 'ai' | 'fallback';
  modelUsed: string | null;
  keyAlias: string | null;
  latencyMs: number;
}

/**
 * Mengambil hint terkurasi statis dari konfigurasi misi sesuai (mission, stage, level).
 */
export function getStaticCuratedHint(
  mission: MissionDefinition,
  stage: MissionStage,
  level: ScaffoldingLevelCode
): string {
  const curated = mission.stages[stage].staticHints[level]?.trim();
  return curated && curated.length > 0 ? curated : DEFAULT_FALLBACK_HINT;
}

function formatConciseHint(rawText: string): string {
  const collapsed = rawText
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();

  if (collapsed.length === 0) {
    return '';
  }

  const sentences = collapsed.match(/[^.!?]+[.!?]*/g) ?? [collapsed];
  const twoSentences = sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .slice(0, 2)
    .join(' ')
    .trim();

  if (twoSentences.length <= MAX_HINT_CHARS) {
    return twoSentences;
  }

  const sliced = twoSentences.slice(0, MAX_HINT_CHARS - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const cleanCut = lastSpace > 120 ? sliced.slice(0, lastSpace) : sliced;
  return `${cleanCut.trimEnd()}…`;
}

/**
 * Menghasilkan Auto-Hint Sokratis via Gemini Flash-Lite dengan graceful degradation
 * otomatis ke Static Curated Hint jika key pool penuh/cooldown atau terjadi error.
 */
export async function generateAutoHint(
  input: GenerateAutoHintInput
): Promise<GenerateAutoHintResult> {
  const { mission, stage, level, currentInput } = input;
  const startedAt = Date.now();
  const fallbackHint = getStaticCuratedHint(mission, stage, level);

  try {
    const { systemInstruction, userPrompt } = buildAutoHintPrompt({
      mission,
      stage,
      level,
      currentInput,
    });

    const pool = input.pool ?? getGeminiKeyPool();

    const execution = await pool.executeWithFailover(
      'hint',
      async (apiKey, modelName) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.3,
            maxOutputTokens: 120,
          },
        });
        return response.text ?? '';
      }
    );

    const formatted = formatConciseHint(execution.result);
    if (formatted.length === 0) {
      return {
        hint: fallbackHint,
        source: 'fallback',
        modelUsed: null,
        keyAlias: null,
        latencyMs: execution.latencyMs,
      };
    }

    return {
      hint: formatted,
      source: 'ai',
      modelUsed: execution.modelUsed,
      keyAlias: execution.keyAlias,
      latencyMs: execution.latencyMs,
    };
  } catch {
    return {
      hint: fallbackHint,
      source: 'fallback',
      modelUsed: null,
      keyAlias: null,
      latencyMs: Math.max(0, Date.now() - startedAt),
    };
  }
}
