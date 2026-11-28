import { NextResponse } from 'next/server';

import { AllKeysExhaustedError } from '@/lib/ai/gemini-pool';
import type { RubricStage } from '@/lib/ai/prompt-builder';
import { evaluateStageAnswer } from '@/lib/ai/rubric-evaluator';
import { getMissionById } from '@/lib/missions';
import { getSessionFromCookies } from '@/lib/services/auth.service';
import {
  assertStageAccess,
  getStudentCurrentLevel,
  markStagePassed,
  saveStageDraft,
} from '@/lib/services/mission-gate.service';
import {
  incrementMissionMetric,
  logAiInteraction,
} from '@/lib/services/telemetry.service';
import { evaluateStageRequestSchema } from '@/lib/validation/schemas';

const AI_QUEUE_BUSY_MESSAGE =
  'AI Mentor sedang antre sebentar, coba kirim ulang dalam 15 detik.';

function isRubricStage(value: string): value is RubricStage {
  return value === 'logic' || value === 'analysis' || value === 'evaluation';
}

export async function POST(
  request: Request,
  context: { params: Promise<{ missionId: string; stage: string }> }
): Promise<NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json(
      { error: 'Sesi tidak valid atau telah berakhir.' },
      { status: 401 }
    );
  }

  const { missionId: rawMissionId, stage: rawStage } = await context.params;

  if (rawStage === 'coding') {
    return NextResponse.json(
      {
        error:
          'Tahap 4 (Coding) dievaluasi secara deterministik melalui Pyodide unit test, bukan evaluator rubrik AI.',
      },
      { status: 400 }
    );
  }

  if (!/^[1-5]$/.test(rawMissionId) || !isRubricStage(rawStage)) {
    return NextResponse.json(
      { error: 'Parameter misi atau tahap tidak valid.' },
      { status: 400 }
    );
  }

  const missionId = Number(rawMissionId);
  const stage: RubricStage = rawStage;
  const mission = getMissionById(missionId);
  if (!mission) {
    return NextResponse.json(
      { error: 'Misi tidak ditemukan.' },
      { status: 404 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format data evaluasi tidak valid.' },
      { status: 400 }
    );
  }

  const parsed = evaluateStageRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message ?? 'Jawaban terlalu singkat atau tidak valid.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { answerText } = parsed.data;

  try {
    const access = await assertStageAccess(session.studentId, mission.id, stage);
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: 'Tahap atau misi ini masih terkunci.',
          redirectUrl: access.redirectUrl,
        },
        { status: 403 }
      );
    }

    const currentLevel = await getStudentCurrentLevel(session.studentId);
    if (!currentLevel) {
      return NextResponse.json(
        { error: 'Profil siswa tidak ditemukan.' },
        { status: 401 }
      );
    }

    await saveStageDraft(session.studentId, mission.id, stage, answerText);

    const { evaluation, modelUsed, keyAlias, latencyMs } =
      await evaluateStageAnswer({
        mission,
        stage,
        level: currentLevel,
        answerText,
      });

    await logAiInteraction({
      studentId: session.studentId,
      missionId: mission.id,
      stage,
      interactionType: 'evaluate',
      promptLevel: currentLevel,
      inputText: answerText,
      responseText: evaluation.feedback_message,
      structuredResultJson: evaluation,
      modelUsed,
      keyAlias,
      source: 'ai',
      latencyMs,
      isPassed: evaluation.is_passed,
    });

    if (evaluation.is_passed) {
      const { nextStage } = await markStagePassed(
        session.studentId,
        mission.id,
        stage
      );
      const nextStageUrl = nextStage
        ? `/missions/${mission.id}/${nextStage}`
        : undefined;

      return NextResponse.json(
        {
          ...evaluation,
          nextStageUrl,
        },
        { status: 200 }
      );
    }

    await incrementMissionMetric(
      session.studentId,
      mission.id,
      'failed_eval_count'
    );

    return NextResponse.json(
      {
        ...evaluation,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof AllKeysExhaustedError) {
      return NextResponse.json(
        { error: AI_QUEUE_BUSY_MESSAGE },
        { status: 503 }
      );
    }

    const safeMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error(
      `[POST /api/missions/${missionId}/${stage}/evaluate] Unexpected error:`,
      safeMessage
    );
    return NextResponse.json(
      { error: 'Terjadi gangguan saat mengevaluasi jawaban. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
