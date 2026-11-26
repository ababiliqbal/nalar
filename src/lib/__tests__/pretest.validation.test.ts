import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { SCAFFOLDING_LEVELS, mapScoreToLevel } from '@/lib/constants/levels';
import { gradePretestAnswers } from '@/lib/constants/pretest-bank';
import { pretestSubmitSchema } from '@/lib/validation/schemas';

const VALID_ANSWERS = {
  '1': 'A',
  '2': 'D',
  '3': 'B',
  '4': 'C',
  '5': 'D',
  '6': 'A',
} as const;

describe('pretestSubmitSchema — Validasi Payload Pengiriman Pretest', () => {
  it('menerima payload valid dengan lengkap 6 jawaban (A-D) dan durationSec >= 0', () => {
    const parsed = pretestSubmitSchema.safeParse({
      answers: VALID_ANSWERS,
      durationSec: 185,
    });

    expect(parsed.success).toBe(true);
    expect(
      pretestSubmitSchema.safeParse({
        answers: VALID_ANSWERS,
        durationSec: 0,
      }).success
    ).toBe(true);
  });

  it('menolak payload dengan jumlah jawaban kurang dari 6 soal', () => {
    const missingQuestion6 = {
      answers: {
        '1': 'A',
        '2': 'D',
        '3': 'B',
        '4': 'C',
        '5': 'D',
      },
      durationSec: 120,
    };

    expect(pretestSubmitSchema.safeParse(missingQuestion6).success).toBe(false);
    expect(
      pretestSubmitSchema.safeParse({ answers: {}, durationSec: 60 }).success
    ).toBe(false);
  });

  it('menolak payload dengan key soal berlebih di luar 1..6', () => {
    const withExtraKey = {
      answers: {
        ...VALID_ANSWERS,
        '7': 'A',
      },
      durationSec: 90,
    };

    expect(pretestSubmitSchema.safeParse(withExtraKey).success).toBe(false);
  });

  it('menolak huruf pilihan di luar A, B, C, D', () => {
    for (const invalidOption of ['E', 'a', 'F', '', '1']) {
      const result = pretestSubmitSchema.safeParse({
        answers: {
          ...VALID_ANSWERS,
          '3': invalidOption,
        },
        durationSec: 120,
      });

      expect(result.success).toBe(false);
    }
  });

  it('menolak durationSec negatif atau bukan bilangan bulat', () => {
    expect(
      pretestSubmitSchema.safeParse({
        answers: VALID_ANSWERS,
        durationSec: -5,
      }).success
    ).toBe(false);

    expect(
      pretestSubmitSchema.safeParse({
        answers: VALID_ANSWERS,
        durationSec: 12.5,
      }).success
    ).toBe(false);
  });
});

describe('Pemetaan Hasil Pretest ke Level Scaffolding & Metadata', () => {
  it('memetakan hasil penilaian skor 0..2 -> EXPLORER, 3..4 -> BUILDER, 5..6 -> ARCHITECT', () => {
    const explorerResult = gradePretestAnswers({
      '1': 'A',
      '2': 'A',
      '3': 'A',
      '4': 'A',
      '5': 'A',
      '6': 'B',
    });
    expect(explorerResult).toEqual({ score: 1, total: 6, level: 'EXPLORER' });
    expect(SCAFFOLDING_LEVELS[explorerResult.level].label).toBe(
      'Level 1: Explorer'
    );
    expect(
      SCAFFOLDING_LEVELS[explorerResult.level].description.length
    ).toBeGreaterThan(0);

    const builderResult = gradePretestAnswers({
      '1': 'A',
      '2': 'D',
      '3': 'B',
      '4': 'C',
      '5': 'A',
      '6': 'B',
    });
    expect(builderResult).toEqual({ score: 4, total: 6, level: 'BUILDER' });
    expect(SCAFFOLDING_LEVELS[builderResult.level].label).toBe(
      'Level 2: Builder'
    );

    const architectResult = gradePretestAnswers(VALID_ANSWERS);
    expect(architectResult).toEqual({ score: 6, total: 6, level: 'ARCHITECT' });
    expect(SCAFFOLDING_LEVELS[architectResult.level].label).toBe(
      'Level 3: Architect'
    );

    expect(mapScoreToLevel(2)).toBe('EXPLORER');
    expect(mapScoreToLevel(3)).toBe('BUILDER');
    expect(mapScoreToLevel(5)).toBe('ARCHITECT');
  });
});
