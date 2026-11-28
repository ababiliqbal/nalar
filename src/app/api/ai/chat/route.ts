import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

import {
  AllKeysExhaustedError,
  getGeminiKeyPool,
} from '@/lib/ai/gemini-pool';
import { buildMentorChatPrompt } from '@/lib/ai/prompt-builder';
import { getMissionById } from '@/lib/missions';
import { getSessionFromCookies } from '@/lib/services/auth.service';
import {
  assertStageAccess,
  getStudentCurrentLevel,
} from '@/lib/services/mission-gate.service';
import {
  getRecentStageChatHistory,
  incrementMissionMetric,
  logAiInteraction,
} from '@/lib/services/telemetry.service';
import { aiChatRequestSchema } from '@/lib/validation/schemas';

const AI_QUEUE_BUSY_MESSAGE =
  'AI Mentor sedang antre sebentar, coba kirim ulang dalam 15 detik.';

interface GeminiStreamChunk {
  text?: string;
}

export async function POST(request: Request): Promise<Response> {
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
      { error: 'Format data permintaan chat tidak valid.' },
      { status: 400 }
    );
  }

  const parsed = aiChatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message ?? 'Parameter permintaan chat tidak valid.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { missionId, stage, message, currentDraft } = parsed.data;
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

    const history = await getRecentStageChatHistory(
      session.studentId,
      mission.id,
      stage,
      8
    );

    const builtPrompt = buildMentorChatPrompt({
      mission,
      stage,
      level: currentLevel,
      userMessage: message,
      currentDraft,
      history,
    });

    const contents = [
      ...builtPrompt.historyMessages.map((entry) => ({
        role: entry.role,
        parts: [{ text: entry.text }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: builtPrompt.userPrompt }],
      },
    ];

    const streamStartedAt = Date.now();
    const pool = getGeminiKeyPool();

    // Failover selesai SEBELUM membuka ReadableStream SSE agar 503 JSON masih bisa dikirim
    const execution = await pool.executeWithFailover<
      AsyncIterable<GeminiStreamChunk>
    >('mentor', async (apiKey, modelName) => {
      const ai = new GoogleGenAI({ apiKey });
      return ai.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          systemInstruction: builtPrompt.systemInstruction,
          temperature: 0.4,
        },
      });
    });

    const encoder = new TextEncoder();

    const sseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let fullResponseText = '';

        try {
          for await (const chunk of execution.result) {
            const delta = chunk.text ?? '';
            if (delta.length > 0) {
              fullResponseText += delta;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
              );
            }
          }

          const totalLatencyMs = Math.max(
            execution.latencyMs,
            Date.now() - streamStartedAt
          );

          // WAJIB await tulis log sebelum menutup stream agar Vercel Serverless tidak memutusnya
          await Promise.all([
            logAiInteraction({
              studentId: session.studentId,
              missionId: mission.id,
              stage,
              interactionType: 'chat',
              promptLevel: currentLevel,
              inputText: message,
              responseText: fullResponseText,
              modelUsed: execution.modelUsed,
              keyAlias: execution.keyAlias,
              source: 'ai',
              latencyMs: totalLatencyMs,
            }),
            incrementMissionMetric(session.studentId, mission.id, 'chat_count'),
          ]);

          controller.enqueue(encoder.encode('data: {"done":true}\n\n'));
          controller.close();
        } catch (streamError: unknown) {
          const safeStreamMsg =
            streamError instanceof Error
              ? streamError.message
              : 'Unknown stream error';
          console.error('[POST /api/ai/chat] Stream error:', safeStreamMsg);

          if (fullResponseText.length > 0) {
            await logAiInteraction({
              studentId: session.studentId,
              missionId: mission.id,
              stage,
              interactionType: 'chat',
              promptLevel: currentLevel,
              inputText: message,
              responseText: fullResponseText,
              modelUsed: execution.modelUsed,
              keyAlias: execution.keyAlias,
              source: 'ai',
              latencyMs: Math.max(
                execution.latencyMs,
                Date.now() - streamStartedAt
              ),
            });
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error:
                  'Koneksi ke AI Mentor terputus saat menjawab. Coba kirim ulang ya.',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    if (error instanceof AllKeysExhaustedError) {
      return NextResponse.json(
        { error: AI_QUEUE_BUSY_MESSAGE },
        { status: 503 }
      );
    }

    const safeMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error('[POST /api/ai/chat] Unexpected error:', safeMessage);
    return NextResponse.json(
      { error: 'Terjadi gangguan saat menghubungi AI Mentor. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
