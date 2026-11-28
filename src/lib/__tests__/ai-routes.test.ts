import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/services/auth.service', () => ({
  getSessionFromCookies: vi.fn(),
}));

vi.mock('@/lib/services/mission-gate.service', () => ({
  assertStageAccess: vi.fn(),
  getStudentCurrentLevel: vi.fn(),
  markStagePassed: vi.fn(),
  saveStageDraft: vi.fn(),
}));

vi.mock('@/lib/services/telemetry.service', () => ({
  logAiInteraction: vi.fn(),
  incrementMissionMetric: vi.fn(),
  getRecentStageChatHistory: vi.fn(),
}));

vi.mock('@/lib/ai/static-hints', () => ({
  generateAutoHint: vi.fn(),
}));

vi.mock('@/lib/ai/rubric-evaluator', () => ({
  evaluateStageAnswer: vi.fn(),
}));

vi.mock('@/lib/ai/gemini-pool', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/gemini-pool')>();
  return {
    ...actual,
    getGeminiKeyPool: vi.fn(),
  };
});

import { POST as postHint } from '@/app/api/ai/hint/route';
import { POST as postChat } from '@/app/api/ai/chat/route';
import { POST as postEvaluate } from '@/app/api/missions/[missionId]/[stage]/evaluate/route';
import {
  AllKeysExhaustedError,
  getGeminiKeyPool,
  type IGeminiKeyPool,
} from '@/lib/ai/gemini-pool';
import { evaluateStageAnswer } from '@/lib/ai/rubric-evaluator';
import { generateAutoHint } from '@/lib/ai/static-hints';
import { getSessionFromCookies } from '@/lib/services/auth.service';
import {
  assertStageAccess,
  getStudentCurrentLevel,
  markStagePassed,
  saveStageDraft,
} from '@/lib/services/mission-gate.service';
import {
  getRecentStageChatHistory,
  incrementMissionMetric,
  logAiInteraction,
} from '@/lib/services/telemetry.service';

const MOCK_SESSION = {
  studentId: 'student-uuid-123',
  currentLevel: 'BUILDER' as const,
  pretestCompleted: true,
  iat: 1_700_000_000,
  exp: 1_700_604_800,
};

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('AI Production Route Handlers (/api/ai/hint, /api/ai/chat, /evaluate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue(MOCK_SESSION);
    vi.mocked(assertStageAccess).mockResolvedValue({ allowed: true });
    vi.mocked(getStudentCurrentLevel).mockResolvedValue('BUILDER');
    vi.mocked(saveStageDraft).mockResolvedValue({
      savedAt: '2026-11-26T10:00:00.000Z',
    });
    vi.mocked(logAiInteraction).mockResolvedValue(undefined);
    vi.mocked(incrementMissionMetric).mockResolvedValue(undefined);
    vi.mocked(getRecentStageChatHistory).mockResolvedValue([]);
    vi.mocked(markStagePassed).mockResolvedValue({ nextStage: 'analysis' });
  });

  it('1. /api/ai/hint menolak permintaan tanpa sesi dengan HTTP 401', async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);

    const res = await postHint(
      jsonRequest('http://localhost/api/ai/hint', {
        missionId: 1,
        stage: 'logic',
        currentInputText: 'Mamat berangkat pukul 06.35 dan harus sampai tepat waktu.',
      })
    );

    expect(res.status).toBe(401);
    expect(generateAutoHint).not.toHaveBeenCalled();
  });

  it('2. /api/ai/hint menolak akses tahap terkunci dengan HTTP 403', async () => {
    vi.mocked(assertStageAccess).mockResolvedValue({
      allowed: false,
      redirectUrl: '/missions/1/logic',
    });

    const res = await postHint(
      jsonRequest('http://localhost/api/ai/hint', {
        missionId: 1,
        stage: 'coding',
        currentInputText: 'def pilih_rute(hujan, banjir, punya_uang): pass',
      })
    );

    expect(res.status).toBe(403);
    expect(generateAutoHint).not.toHaveBeenCalled();
  });

  it('3. /api/ai/hint mengembalikan HTTP 200 dengan { hint, source: "fallback" } saat cooldown dan mencatat log', async () => {
    vi.mocked(generateAutoHint).mockResolvedValue({
      hint: 'Periksa satu per satu syarat Jalur A, Jalur B, dan Jalur C.',
      source: 'fallback',
      modelUsed: null,
      keyAlias: null,
      latencyMs: 5,
    });

    const res = await postHint(
      jsonRequest('http://localhost/api/ai/hint', {
        missionId: 1,
        stage: 'logic',
        currentInputText: 'Mamat berangkat 06.35 saat hujan deras tanpa uang tol.',
      })
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { hint: string; source: string };
    expect(data).toEqual({
      hint: 'Periksa satu per satu syarat Jalur A, Jalur B, dan Jalur C.',
      source: 'fallback',
    });
    expect(logAiInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: MOCK_SESSION.studentId,
        missionId: 1,
        stage: 'logic',
        interactionType: 'hint',
        source: 'fallback',
      })
    );
    expect(incrementMissionMetric).toHaveBeenCalledWith(
      MOCK_SESSION.studentId,
      1,
      'hint_count'
    );
  });

  it('4. /api/missions/1/coding/evaluate ditolak dengan HTTP 400 karena Tahap 4 deterministik via Pyodide', async () => {
    const res = await postEvaluate(
      jsonRequest('http://localhost/api/missions/1/coding/evaluate', {
        answerText: 'def pilih_rute(h, b, u): return "Jalur B"',
      }),
      { params: Promise.resolve({ missionId: '1', stage: 'coding' }) }
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Pyodide|deterministik/i);
    expect(evaluateStageAnswer).not.toHaveBeenCalled();
  });

  it('5. /api/missions/1/logic/evaluate saat is_passed: false tidak memanggil markStagePassed dan menaikkan failed_eval_count', async () => {
    vi.mocked(evaluateStageAnswer).mockResolvedValue({
      evaluation: {
        criteria_met: ['Menyebut Jalur B'],
        missing_points: ['Belum menjelaskan batas waktu 25 menit'],
        feedback_message:
          'Coba sebutkan juga berapa menit sisa waktu Mamat dari 06.35 sampai 07.00 ya.',
        is_passed: false,
      },
      modelUsed: 'gemini-2.5-flash',
      keyAlias: 'key_0',
      latencyMs: 320,
    });

    const res = await postEvaluate(
      jsonRequest('http://localhost/api/missions/1/logic/evaluate', {
        answerText: 'Menurutku Mamat sebaiknya lewat Jalur B saja.',
      }),
      { params: Promise.resolve({ missionId: '1', stage: 'logic' }) }
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      is_passed: boolean;
      nextStageUrl?: string;
    };
    expect(data.is_passed).toBe(false);
    expect(data.nextStageUrl).toBeUndefined();
    expect(markStagePassed).not.toHaveBeenCalled();
    expect(incrementMissionMetric).toHaveBeenCalledWith(
      MOCK_SESSION.studentId,
      1,
      'failed_eval_count'
    );
    expect(saveStageDraft).toHaveBeenCalledTimes(1);
    expect(logAiInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionType: 'evaluate',
        isPassed: false,
      })
    );
  });

  it('6. /api/missions/1/logic/evaluate saat is_passed: true memanggil markStagePassed dan mengembalikan nextStageUrl', async () => {
    vi.mocked(evaluateStageAnswer).mockResolvedValue({
      evaluation: {
        criteria_met: [
          'Batas 25 menit',
          'Jalur A macet saat hujan',
          'Jalur C butuh uang tol',
          'Memilih Jalur B karena tidak banjir',
        ],
        missing_points: [],
        feedback_message:
          'Penalaranmu sudah lengkap dan runtut. Silakan lanjut menyusun pseudocode!',
        is_passed: true,
      },
      modelUsed: 'gemini-2.5-flash',
      keyAlias: 'key_1',
      latencyMs: 280,
    });

    const res = await postEvaluate(
      jsonRequest('http://localhost/api/missions/1/logic/evaluate', {
        answerText:
          'Batas waktu 25 menit. Jalur A 45 menit saat hujan, Jalur C butuh uang tol, jadi pilih Jalur B karena tidak banjir.',
      }),
      { params: Promise.resolve({ missionId: '1', stage: 'logic' }) }
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      is_passed: boolean;
      nextStageUrl?: string;
    };
    expect(data.is_passed).toBe(true);
    expect(data.nextStageUrl).toBe('/missions/1/analysis');
    expect(markStagePassed).toHaveBeenCalledWith(
      MOCK_SESSION.studentId,
      1,
      'logic'
    );
    expect(incrementMissionMetric).not.toHaveBeenCalled();
  });

  it('7. /api/missions/1/logic/evaluate saat AllKeysExhaustedError mengembalikan HTTP 503 ramah', async () => {
    vi.mocked(evaluateStageAnswer).mockRejectedValue(
      new AllKeysExhaustedError('Semua kunci sedang cooldown')
    );

    const res = await postEvaluate(
      jsonRequest('http://localhost/api/missions/1/logic/evaluate', {
        answerText: 'Batas waktu 25 menit jadi pilih Jalur B.',
      }),
      { params: Promise.resolve({ missionId: '1', stage: 'logic' }) }
    );

    expect(res.status).toBe(503);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('antre sebentar');
  });

  it('8. /api/ai/chat mengembalikan SSE stream (delta + done) dan menunggu log sebelum tutup; serta 503 saat AllKeysExhaustedError', async () => {
    async function* fakeChunks() {
      yield { text: 'Halo! ' };
      yield { text: 'Coba cek syarat Jalur A dulu ya.' };
    }

    const mockStreamPool: IGeminiKeyPool = {
      async executeWithFailover<T>() {
        return {
          result: fakeChunks() as unknown as T,
          keyAlias: 'key_0',
          modelUsed: 'gemini-2.5-flash',
          latencyMs: 95,
        };
      },
    };
    vi.mocked(getGeminiKeyPool).mockReturnValue(mockStreamPool);

    const sseRes = await postChat(
      jsonRequest('http://localhost/api/ai/chat', {
        missionId: 1,
        stage: 'logic',
        message: 'Kenapa Jalur A tidak dipilih saat hujan?',
      })
    );

    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get('Content-Type')).toContain('text/event-stream');

    const rawSseText = await sseRes.text();
    expect(rawSseText).toContain('data: {"delta":"Halo! "}\n\n');
    expect(rawSseText).toContain(
      'data: {"delta":"Coba cek syarat Jalur A dulu ya."}\n\n'
    );
    expect(rawSseText).toContain('data: {"done":true}\n\n');

    expect(logAiInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: MOCK_SESSION.studentId,
        missionId: 1,
        stage: 'logic',
        interactionType: 'chat',
        responseText: 'Halo! Coba cek syarat Jalur A dulu ya.',
      })
    );
    expect(incrementMissionMetric).toHaveBeenCalledWith(
      MOCK_SESSION.studentId,
      1,
      'chat_count'
    );

    // Uji 503 saat AllKeysExhaustedError sebelum stream dibuka
    const exhaustedPool: IGeminiKeyPool = {
      async executeWithFailover() {
        throw new AllKeysExhaustedError('Semua kunci cooldown');
      },
    };
    vi.mocked(getGeminiKeyPool).mockReturnValue(exhaustedPool);

    const busyRes = await postChat(
      jsonRequest('http://localhost/api/ai/chat', {
        missionId: 1,
        stage: 'logic',
        message: 'Halo mentor',
      })
    );

    expect(busyRes.status).toBe(503);
    const busyData = (await busyRes.json()) as { error: string };
    expect(busyData.error).toContain('antre sebentar');
  });
});
