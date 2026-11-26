import 'server-only';

import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { z } from 'zod';

import {
  getGeminiKeyPool,
  type IGeminiKeyPool,
} from '@/lib/ai/gemini-pool';
import {
  buildRubricEvaluationPrompt,
  type RubricStage,
} from '@/lib/ai/prompt-builder';
import type {
  MissionDefinition,
  RubricEvaluationResult,
  ScaffoldingLevelCode,
} from '@/lib/types/domain';

export const RubricEvaluationSchema = z.object({
  criteria_met: z.array(z.string().trim().min(1)),
  missing_points: z.array(z.string().trim().min(1)),
  feedback_message: z.string().trim().min(10),
  is_passed: z.boolean(),
});

const MAX_PARSE_ATTEMPTS = 2;

const RUBRIC_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    criteria_met: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Daftar kriteria rubrik objektif yang sudah dipenuhi secara substansial oleh jawaban siswa.',
    },
    missing_points: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Daftar poin rubrik yang belum terpenuhi atau masih keliru pada jawaban siswa.',
    },
    feedback_message: {
      type: Type.STRING,
      description:
        'Pesan umpan balik Sokratis yang ramah dalam Bahasa Indonesia sesuai level scaffolding siswa.',
    },
    is_passed: {
      type: Type.BOOLEAN,
      description:
        'Bernilai true hanya jika seluruh kriteria inti terpenuhi dan missing_points kosong.',
    },
  },
  required: [
    'criteria_met',
    'missing_points',
    'feedback_message',
    'is_passed',
  ],
};

function createFailClosedEvaluation(): RubricEvaluationResult {
  return {
    criteria_met: [],
    missing_points: ['Format evaluasi belum dapat dipastikan'],
    feedback_message:
      'Maaf, AI Mentor sedang kesulitan membaca struktur jawabanmu. Coba rapikan penjelasanmu lalu klik Cek Jawaban sekali lagi ya.',
    is_passed: false,
  };
}

export interface EvaluateStageAnswerInput {
  mission: MissionDefinition;
  stage: RubricStage;
  level: ScaffoldingLevelCode;
  answerText: string;
  pool?: IGeminiKeyPool;
}

export interface EvaluateStageAnswerResult {
  evaluation: RubricEvaluationResult;
  modelUsed: string;
  keyAlias: string;
  latencyMs: number;
}

/**
 * Mem-parse keluaran JSON dari LLM, memvalidasi ketat dengan Zod, dan menerapkan
 * guard konsistensi logika anti-halusinasi kelulusan.
 */
export function parseAndGuardEvaluation(
  rawText: string
): RubricEvaluationResult | null {
  const trimmed = rawText.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(unfenced);
  } catch {
    return null;
  }

  const validated = RubricEvaluationSchema.safeParse(parsedJson);
  if (!validated.success) {
    return null;
  }

  const { criteria_met, missing_points, feedback_message } = validated.data;
  let isPassed = validated.data.is_passed;

  // Guard konsistensi logika: cegah halusinasi kelulusan
  if (criteria_met.length === 0) {
    isPassed = false;
  }
  if (isPassed && missing_points.length > 0) {
    isPassed = false;
  }

  return {
    criteria_met,
    missing_points,
    feedback_message,
    is_passed: isPassed,
  };
}

/**
 * Mengevaluasi jawaban siswa pada Tahap 1–3 menggunakan Gemini Structured Output JSON Schema,
 * dengan maksimal 1 kali retry saat parsing gagal dan fallback fail-closed.
 * Meneruskan AllKeysExhaustedError agar Route Handler dapat mengembalikan HTTP 503 ramah.
 */
export async function evaluateStageAnswer(
  input: EvaluateStageAnswerInput
): Promise<EvaluateStageAnswerResult> {
  const { mission, stage, level, answerText } = input;
  const { systemInstruction, userPrompt } = buildRubricEvaluationPrompt({
    mission,
    stage,
    level,
    answerText,
  });

  const pool = input.pool ?? getGeminiKeyPool();

  let totalLatencyMs = 0;
  let lastModelUsed = '';
  let lastKeyAlias = '';

  for (let attempt = 1; attempt <= MAX_PARSE_ATTEMPTS; attempt += 1) {
    const execution = await pool.executeWithFailover(
      'mentor',
      async (apiKey, modelName) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: RUBRIC_RESPONSE_SCHEMA,
          },
        });
        return response.text ?? '';
      }
    );

    totalLatencyMs += execution.latencyMs;
    lastModelUsed = execution.modelUsed;
    lastKeyAlias = execution.keyAlias;

    const evaluated = parseAndGuardEvaluation(execution.result);
    if (evaluated !== null) {
      return {
        evaluation: evaluated,
        modelUsed: execution.modelUsed,
        keyAlias: execution.keyAlias,
        latencyMs: totalLatencyMs,
      };
    }
  }

  return {
    evaluation: createFailClosedEvaluation(),
    modelUsed: lastModelUsed,
    keyAlias: lastKeyAlias,
    latencyMs: totalLatencyMs,
  };
}
