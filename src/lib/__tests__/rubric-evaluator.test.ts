import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  AllKeysExhaustedError,
  type GeminiExecutionResult,
  type GeminiModelTier,
  type IGeminiKeyPool,
} from '@/lib/ai/gemini-pool';
import {
  evaluateStageAnswer,
  parseAndGuardEvaluation,
} from '@/lib/ai/rubric-evaluator';
import {
  generateAutoHint,
  getStaticCuratedHint,
} from '@/lib/ai/static-hints';
import { getMissionById } from '@/lib/missions';

const mission1 = getMissionById(1)!;
const mission3 = getMissionById(3)!;

function createMockPool(
  responses: ReadonlyArray<string | Error>,
  options: { modelUsed?: string; keyAlias?: string; latencyMs?: number } = {}
): { pool: IGeminiKeyPool; callCount: () => number } {
  let index = 0;

  const pool: IGeminiKeyPool = {
    async executeWithFailover<T>(
      tier: GeminiModelTier
    ): Promise<GeminiExecutionResult<T>> {
      const next = responses[Math.min(index, responses.length - 1)];
      index += 1;

      if (next instanceof Error) {
        throw next;
      }

      return {
        result: next as unknown as T,
        keyAlias: options.keyAlias ?? 'key_0',
        modelUsed:
          options.modelUsed ??
          (tier === 'hint' ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash'),
        latencyMs: options.latencyMs ?? 120,
      };
    },
  };

  return {
    pool,
    callCount: () => index,
  };
}

describe('rubric-evaluator.ts & static-hints.ts — Structured Output, Fail-Closed, & Fallback', () => {
  it('1. evaluasi valid lulus (criteria_met terisi, missing_points kosong) mengembalikan is_passed: true', async () => {
    const validPassJson = JSON.stringify({
      criteria_met: [
        'Menyebut batas waktu 25 menit',
        'Menjelaskan Jalur A macet 45 menit saat hujan',
        'Memilih Jalur B karena tidak banjir',
      ],
      missing_points: [],
      feedback_message:
        'Mantap! Alur penalaranmu sudah runtut dan mempertimbangkan batas waktu serta kondisi tiap jalur.',
      is_passed: true,
    });

    const { pool, callCount } = createMockPool([validPassJson]);

    const res = await evaluateStageAnswer({
      mission: mission1,
      stage: 'logic',
      level: 'BUILDER',
      answerText:
        'Batas waktu Mamat 25 menit. Jalur A macet 45 menit saat hujan, Jalur C butuh uang tol, jadi pilih Jalur B karena tidak banjir.',
      pool,
    });

    expect(callCount()).toBe(1);
    expect(res.evaluation.is_passed).toBe(true);
    expect(res.evaluation.criteria_met).toHaveLength(3);
    expect(res.evaluation.missing_points).toEqual([]);
    expect(res.keyAlias).toBe('key_0');
    expect(res.modelUsed).toBe('gemini-2.5-flash');
  });

  it('2. evaluasi valid belum lulus mengembalikan is_passed: false beserta missing_points', async () => {
    const notPassedJson = JSON.stringify({
      criteria_met: ['Menyebut Jalur B sebagai pilihan'],
      missing_points: [
        'Belum menjelaskan alasan Jalur A gugur saat hujan',
        'Belum menyebut batas waktu maksimal 25 menit',
      ],
      feedback_message:
        'Pilihan jalurmu sudah mengarah tepat, tapi coba jelaskan dulu mengapa Jalur A tidak bisa dipakai saat hujan ya!',
      is_passed: false,
    });

    const { pool } = createMockPool([notPassedJson]);

    const res = await evaluateStageAnswer({
      mission: mission1,
      stage: 'logic',
      level: 'EXPLORER',
      answerText: 'Pilih Jalur B saja.',
      pool,
    });

    expect(res.evaluation.is_passed).toBe(false);
    expect(res.evaluation.missing_points).toHaveLength(2);
    expect(res.evaluation.feedback_message.length).toBeGreaterThanOrEqual(10);
  });

  it('3. guard konsistensi memaksa is_passed: false jika missing_points tidak kosong atau criteria_met kosong', () => {
    const hallucinatedWithMissing = JSON.stringify({
      criteria_met: ['Menyebut batas 25 menit'],
      missing_points: ['Belum menjelaskan cabang else'],
      feedback_message:
        'Penjelasanmu bagus, namun masih ada satu poin yang terlewat.',
      is_passed: true,
    });

    const guardedA = parseAndGuardEvaluation(
      `\`\`\`json\n${hallucinatedWithMissing}\n\`\`\``
    );
    expect(guardedA).not.toBeNull();
    expect(guardedA?.is_passed).toBe(false);

    const hallucinatedEmptyCriteria = JSON.stringify({
      criteria_met: [],
      missing_points: [],
      feedback_message: 'Semua sudah bagus, silakan lanjut ke tahap berikutnya.',
      is_passed: true,
    });

    const guardedB = parseAndGuardEvaluation(hallucinatedEmptyCriteria);
    expect(guardedB).not.toBeNull();
    expect(guardedB?.is_passed).toBe(false);
  });

  it('4. JSON rusak pada percobaan pertama lalu valid pada retry ke-2 berhasil terparse pada retry', async () => {
    const validRetryJson = JSON.stringify({
      criteria_met: ['Menuliskan INPUT, IF, ELIF, ELSE, OUTPUT'],
      missing_points: [],
      feedback_message:
        'Pseudocode yang kamu susun sudah rapi dan mengikuti urutan prioritas jalur.',
      is_passed: true,
    });

    const { pool, callCount } = createMockPool([
      '{ rusak tidak valid json',
      validRetryJson,
    ]);

    const res = await evaluateStageAnswer({
      mission: mission1,
      stage: 'analysis',
      level: 'ARCHITECT',
      answerText: 'INPUT hujan, banjir, punya_uang ...',
      pool,
    });

    expect(callCount()).toBe(2);
    expect(res.evaluation.is_passed).toBe(true);
    expect(res.latencyMs).toBe(240);
  });

  it('5. JSON rusak pada kedua percobaan mengembalikan respons fail-closed (is_passed: false) tanpa crash', async () => {
    const { pool, callCount } = createMockPool([
      'bukan json sama sekali',
      '{"criteria_met": "salah-tipe"}',
    ]);

    const res = await evaluateStageAnswer({
      mission: mission1,
      stage: 'evaluation',
      level: 'BUILDER',
      answerText: 'Jika semua gagal maka tidak ada jalur aman.',
      pool,
    });

    expect(callCount()).toBe(2);
    expect(res.evaluation).toEqual({
      criteria_met: [],
      missing_points: ['Format evaluasi belum dapat dipastikan'],
      feedback_message:
        'Maaf, AI Mentor sedang kesulitan membaca struktur jawabanmu. Coba rapikan penjelasanmu lalu klik Cek Jawaban sekali lagi ya.',
      is_passed: false,
    });
  });

  it('6. AllKeysExhaustedError pada evaluateStageAnswer diteruskan (rethrow) agar Route Handler merespons 503', async () => {
    const { pool, callCount } = createMockPool([
      new AllKeysExhaustedError('Semua kunci sedang cooldown'),
    ]);

    await expect(
      evaluateStageAnswer({
        mission: mission1,
        stage: 'logic',
        level: 'EXPLORER',
        answerText: 'Jawaban siswa untuk evaluasi.',
        pool,
      })
    ).rejects.toBeInstanceOf(AllKeysExhaustedError);

    expect(callCount()).toBe(1);
  });

  it('7. AllKeysExhaustedError pada generateAutoHint TIDAK throw dan mengembalikan static curated hint (source: fallback)', async () => {
    const { pool } = createMockPool([
      new AllKeysExhaustedError('Semua kunci sedang cooldown'),
    ]);

    const fallbackRes = await generateAutoHint({
      mission: mission3,
      stage: 'coding',
      level: 'EXPLORER',
      currentInput: 'def hitung_total_waktu(daftar_loket):\n    total = 0',
      pool,
    });

    expect(fallbackRes.source).toBe('fallback');
    expect(fallbackRes.hint).toBe(
      getStaticCuratedHint(mission3, 'coding', 'EXPLORER')
    );
    expect(fallbackRes.modelUsed).toBeNull();
    expect(fallbackRes.keyAlias).toBeNull();

    // Verifikasi jalur sukses AI juga bekerja dan membatasi ke maks 2 kalimat
    const { pool: healthyPool } = createMockPool([
      'Coba cek dulu apakah total_waktu sudah diletakkan di luar loop. Periksa juga tiap pesanan di dalam loket. Kalimat ketiga ini seharusnya dipotong otomatis.',
    ]);
    const aiRes = await generateAutoHint({
      mission: mission3,
      stage: 'coding',
      level: 'BUILDER',
      currentInput: 'for loket in daftar_loket:',
      pool: healthyPool,
    });

    expect(aiRes.source).toBe('ai');
    expect(aiRes.modelUsed).toBe('gemini-2.5-flash-lite');
    expect(aiRes.keyAlias).toBe('key_0');
    expect(aiRes.hint).not.toContain('Kalimat ketiga');
  });
});
