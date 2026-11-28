import 'server-only';

import type { ChatHistoryMessage } from '@/lib/ai/prompt-builder';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import type {
  MissionStage,
  RubricEvaluationResult,
  ScaffoldingLevelCode,
} from '@/lib/types/domain';

export type AiInteractionType =
  | 'hint'
  | 'chat'
  | 'evaluate'
  | 'coding_feedback';

export type MissionMetricField =
  | 'hint_count'
  | 'chat_count'
  | 'failed_eval_count';

export interface AiInteractionLogEntry {
  studentId: string;
  missionId: 1 | 2 | 3 | 4 | 5;
  stage: MissionStage;
  interactionType: AiInteractionType;
  promptLevel: ScaffoldingLevelCode;
  inputText: string;
  responseText: string;
  structuredResultJson?:
    | Record<string, unknown>
    | RubricEvaluationResult
    | null;
  modelUsed?: string | null;
  keyAlias?: string | null;
  source?: 'ai' | 'fallback';
  latencyMs?: number | null;
  isPassed?: boolean | null;
}

interface RecentLogRow {
  input_text: string;
  response_text: string;
}

interface MetricRow {
  hint_count: number;
  chat_count: number;
  failed_eval_count: number;
}

/**
 * Mencatat 1 baris telemetri interaksi AI ke `public.ai_interaction_logs`.
 * Gagal tulis tidak pernah memblokir atau melempar error ke siswa.
 */
export async function logAiInteraction(
  entry: AiInteractionLogEntry
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('ai_interaction_logs').insert({
      student_id: entry.studentId,
      mission_id: entry.missionId,
      stage: entry.stage,
      interaction_type: entry.interactionType,
      prompt_level: entry.promptLevel,
      input_text: entry.inputText,
      response_text: entry.responseText,
      structured_result_json: entry.structuredResultJson ?? null,
      model_used: entry.modelUsed ?? null,
      key_alias: entry.keyAlias ?? null,
      source: entry.source ?? 'ai',
      latency_ms:
        typeof entry.latencyMs === 'number'
          ? Math.max(0, Math.round(entry.latencyMs))
          : null,
      is_passed: entry.isPassed ?? null,
    });

    if (error) {
      console.error(
        '[telemetry] failed to log ai interaction',
        error.message
      );
    }
  } catch (err: unknown) {
    const safeMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[telemetry] failed to log ai interaction', safeMessage);
  }
}

/**
 * Menaikkan counter metrik misi (`hint_count`, `chat_count`, atau `failed_eval_count`)
 * pada `public.mission_progress` untuk kebutuhan adaptasi fading scaffolding (FR-07).
 */
export async function incrementMissionMetric(
  studentId: string,
  missionId: number,
  metric: MissionMetricField
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: currentRow, error: readError } = await supabase
      .from('mission_progress')
      .select('hint_count, chat_count, failed_eval_count')
      .eq('student_id', studentId)
      .eq('mission_id', missionId)
      .maybeSingle<MetricRow>();

    if (readError || !currentRow) {
      if (readError) {
        console.error(
          `[telemetry] failed to read ${metric}`,
          readError.message
        );
      }
      return;
    }

    const nextValue = (currentRow[metric] ?? 0) + 1;
    const { error: updateError } = await supabase
      .from('mission_progress')
      .update({
        [metric]: nextValue,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', studentId)
      .eq('mission_id', missionId);

    if (updateError) {
      console.error(
        `[telemetry] failed to increment ${metric}`,
        updateError.message
      );
    }
  } catch (err: unknown) {
    const safeMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[telemetry] failed to increment ${metric}`, safeMessage);
  }
}

/**
 * Mengambil riwayat percakapan tahap aktif (`chat`, `evaluate`, `coding_feedback`)
 * dalam urutan kronologis lama -> baru sebagai konteks AI Mentor.
 */
export async function getRecentStageChatHistory(
  studentId: string,
  missionId: number,
  stage: MissionStage,
  limit = 8
): Promise<ChatHistoryMessage[]> {
  try {
    const safeLimit = Math.max(1, Math.min(limit, 20));
    const pairLimit = Math.ceil(safeLimit / 2);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ai_interaction_logs')
      .select('input_text, response_text')
      .eq('student_id', studentId)
      .eq('mission_id', missionId)
      .eq('stage', stage)
      .in('interaction_type', ['chat', 'evaluate', 'coding_feedback'])
      .order('created_at', { ascending: false })
      .limit(pairLimit)
      .returns<RecentLogRow[]>();

    if (error || !data) {
      if (error) {
        console.error(
          '[telemetry] failed to load stage chat history',
          error.message
        );
      }
      return [];
    }

    const chronological = [...data].reverse();
    const messages: ChatHistoryMessage[] = [];

    for (const row of chronological) {
      if (row.input_text.trim().length > 0) {
        messages.push({ role: 'user', text: row.input_text });
      }
      if (row.response_text.trim().length > 0) {
        messages.push({ role: 'model', text: row.response_text });
      }
    }

    return messages.slice(-safeLimit);
  } catch (err: unknown) {
    const safeMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[telemetry] failed to load stage chat history', safeMessage);
    return [];
  }
}
