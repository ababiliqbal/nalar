import { NextResponse } from 'next/server';

import { generateAutoHint } from '@/lib/ai/static-hints';
import { getMissionById } from '@/lib/missions';
import { getSessionFromCookies } from '@/lib/services/auth.service';
import {
  assertStageAccess,
  getStudentCurrentLevel,
} from '@/lib/services/mission-gate.service';
import {
  incrementMissionMetric,
  logAiInteraction,
} from '@/lib/services/telemetry.service';
import { aiHintRequestSchema } from '@/lib/validation/schemas';

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json(
      { error: 'Sesi tidak valid atau telah berakhir.' },
      { status: 401 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format data permintaan tidak valid.' },
      { status: 400 }
    );
  }

  const parsed = aiHintRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message ?? 'Parameter permintaan auto-hint tidak valid.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { missionId, stage, currentInputText } = parsed.data;
  const mission = getMissionById(missionId);
  if (!mission) {
    return NextResponse.json(
      { error: 'Misi tidak ditemukan.' },
      { status: 404 }
    );
  }

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

    const hintResult = await generateAutoHint({
      mission,
      stage,
      level: currentLevel,
      currentInput: currentInputText,
    });

    await Promise.all([
      logAiInteraction({
        studentId: session.studentId,
        missionId: mission.id,
        stage,
        interactionType: 'hint',
        promptLevel: currentLevel,
        inputText: currentInputText,
        responseText: hintResult.hint,
        modelUsed: hintResult.modelUsed,
        keyAlias: hintResult.keyAlias,
        source: hintResult.source,
        latencyMs: hintResult.latencyMs,
      }),
      incrementMissionMetric(session.studentId, mission.id, 'hint_count'),
    ]);

    return NextResponse.json(
      {
        hint: hintResult.hint,
        source: hintResult.source,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const safeMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error('[POST /api/ai/hint] Unexpected error:', safeMessage);
    return NextResponse.json(
      { error: 'Gagal memproses petunjuk otomatis.' },
      { status: 500 }
    );
  }
}
