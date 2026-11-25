import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  SCAFFOLDING_LEVELS,
  mapScoreToLevel,
} from '@/lib/constants/levels';
import {
  PRETEST_TOTAL_QUESTIONS,
  getPublicPretestQuestions,
  gradePretestAnswers,
} from '@/lib/constants/pretest-bank';
import { MISSIONS, getMissionById } from '@/lib/missions';
import type {
  PretestOptionKey,
  ScaffoldingLevelCode,
} from '@/lib/types/domain';

const OPTION_KEYS: readonly PretestOptionKey[] = ['A', 'B', 'C', 'D'];
const LEVEL_CODES: readonly ScaffoldingLevelCode[] = [
  'EXPLORER',
  'BUILDER',
  'ARCHITECT',
];

function discoverAnswerKeys(): Record<string, PretestOptionKey> {
  const questions = getPublicPretestQuestions();
  const discovered: Record<string, PretestOptionKey> = {};

  for (const question of questions) {
    const matchedKeys = OPTION_KEYS.filter(
      (key) => gradePretestAnswers({ [question.id]: key }).score === 1
    );

    expect(matchedKeys).toHaveLength(1);
    discovered[question.id] = matchedKeys[0];
  }

  return discovered;
}

describe('levels.ts — Konstanta Scaffolding & Pemetaan Skor', () => {
  it('mendefinisikan 3 level kanonik EXPLORER, BUILDER, dan ARCHITECT lengkap dengan warna badge', () => {
    expect(Object.keys(SCAFFOLDING_LEVELS)).toEqual([
      'EXPLORER',
      'BUILDER',
      'ARCHITECT',
    ]);
    expect(SCAFFOLDING_LEVELS.EXPLORER.rank).toBe(1);
    expect(SCAFFOLDING_LEVELS.EXPLORER.label).toBe('Level 1: Explorer');
    expect(SCAFFOLDING_LEVELS.EXPLORER.badge.colorName).toBe('teal');

    expect(SCAFFOLDING_LEVELS.BUILDER.rank).toBe(2);
    expect(SCAFFOLDING_LEVELS.BUILDER.label).toBe('Level 2: Builder');
    expect(SCAFFOLDING_LEVELS.BUILDER.badge.colorName).toBe('amber');

    expect(SCAFFOLDING_LEVELS.ARCHITECT.rank).toBe(3);
    expect(SCAFFOLDING_LEVELS.ARCHITECT.label).toBe('Level 3: Architect');
    expect(SCAFFOLDING_LEVELS.ARCHITECT.badge.colorName).toBe('blue');
  });

  it('memetakan skor 0..2 -> EXPLORER, 3..4 -> BUILDER, 5..6 -> ARCHITECT', () => {
    expect(mapScoreToLevel(0)).toBe('EXPLORER');
    expect(mapScoreToLevel(1)).toBe('EXPLORER');
    expect(mapScoreToLevel(2)).toBe('EXPLORER');

    expect(mapScoreToLevel(3)).toBe('BUILDER');
    expect(mapScoreToLevel(4)).toBe('BUILDER');

    expect(mapScoreToLevel(5)).toBe('ARCHITECT');
    expect(mapScoreToLevel(6)).toBe('ARCHITECT');
  });

  it('menangani input skor di luar rentang atau NaN secara deterministik', () => {
    expect(mapScoreToLevel(-1)).toBe('EXPLORER');
    expect(mapScoreToLevel(Number.NaN)).toBe('EXPLORER');
    expect(mapScoreToLevel(7)).toBe('ARCHITECT');
  });
});

describe('pretest-bank.ts — Integritas Bank Soal & Penilaian Server-Side', () => {
  it('memiliki tepat 6 soal dengan ID unik 1..6', () => {
    const questions = getPublicPretestQuestions();

    expect(PRETEST_TOTAL_QUESTIONS).toBe(6);
    expect(questions).toHaveLength(6);

    const ids = questions.map((question) => question.id);
    const numbers = questions.map((question) => question.number);

    expect(new Set(ids).size).toBe(6);
    expect(ids).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('memiliki tepat 4 opsi (A, B, C, D) non-kosong pada setiap soal', () => {
    const questions = getPublicPretestQuestions();

    for (const question of questions) {
      expect(question.question.trim().length).toBeGreaterThan(0);
      expect(question.options).toHaveLength(4);
      expect(question.options.map((option) => option.key)).toEqual([
        'A',
        'B',
        'C',
        'D',
      ]);

      for (const option of question.options) {
        expect(option.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('getPublicPretestQuestions() tidak mengandung properti answer', () => {
    const questions = getPublicPretestQuestions();

    for (const question of questions) {
      expect('answer' in question).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(question, 'answer')).toBe(
        false
      );
    }
  });

  it('memiliki distribusi kunci seimbang (maksimal 2 kali per huruf, tanpa kunci berurutan sama)', () => {
    const questions = getPublicPretestQuestions();
    const answerKeys = discoverAnswerKeys();
    const orderedKeys = questions.map((question) => answerKeys[question.id]);

    expect(orderedKeys).toEqual(['A', 'D', 'B', 'C', 'D', 'A']);

    const counts: Record<PretestOptionKey, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    };

    for (const key of orderedKeys) {
      counts[key] += 1;
    }

    for (const optionKey of OPTION_KEYS) {
      expect(counts[optionKey]).toBeGreaterThanOrEqual(1);
      expect(counts[optionKey]).toBeLessThanOrEqual(2);
    }

    for (let i = 1; i < orderedKeys.length; i += 1) {
      expect(orderedKeys[i]).not.toBe(orderedKeys[i - 1]);
    }
  });

  it('gradePretestAnswers menghasilkan skor 6 untuk semua benar dan 0 untuk semua salah', () => {
    const answerKeys = discoverAnswerKeys();

    const allCorrect = gradePretestAnswers(answerKeys);
    expect(allCorrect).toEqual({
      score: 6,
      total: 6,
      level: 'ARCHITECT',
    });

    const allWrongInput: Record<string, string> = {};
    for (const [id, correctKey] of Object.entries(answerKeys)) {
      const wrongKey = OPTION_KEYS.find((key) => key !== correctKey);
      expect(wrongKey).toBeDefined();
      allWrongInput[id] = wrongKey ?? 'A';
    }

    const allWrong = gradePretestAnswers(allWrongInput);
    expect(allWrong).toEqual({
      score: 0,
      total: 6,
      level: 'EXPLORER',
    });

    const halfCorrectInput: Record<string, string> = {
      ...allWrongInput,
      '1': answerKeys['1'],
      '2': answerKeys['2'],
      '3': answerKeys['3'],
    };

    expect(gradePretestAnswers(halfCorrectInput)).toEqual({
      score: 3,
      total: 6,
      level: 'BUILDER',
    });
  });
});

describe('missions/index.ts — Integritas Konfigurasi 5 Misi KKA', () => {
  it('memiliki tepat 5 misi berurutan dengan ID 1, 2, 3, 4, 5 dan helper getMissionById akurat', () => {
    expect(MISSIONS).toHaveLength(5);
    expect(MISSIONS.map((mission) => mission.id)).toEqual([1, 2, 3, 4, 5]);

    for (const expectedId of [1, 2, 3, 4, 5] as const) {
      const found = getMissionById(expectedId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(expectedId);
    }

    expect(getMissionById(0)).toBeUndefined();
    expect(getMissionById(6)).toBeUndefined();
  });

  it('memiliki narasi kasus, 4 tahap lengkap, reflectionQuestion, dan minimal 3 rubricCriteria pada tahap 1–3', () => {
    const slugs = new Set<string>();

    for (const mission of MISSIONS) {
      expect(mission.slug.trim().length).toBeGreaterThan(0);
      expect(slugs.has(mission.slug)).toBe(false);
      slugs.add(mission.slug);

      expect(mission.title.trim().length).toBeGreaterThan(0);
      expect(mission.subtitle.trim().length).toBeGreaterThan(0);
      expect(mission.kkaTopic.trim().length).toBeGreaterThan(0);
      expect(mission.caseNarrative.trim().length).toBeGreaterThan(0);
      expect(mission.reflectionQuestion.trim().length).toBeGreaterThan(0);

      expect(mission.stages.logic.prompt.trim().length).toBeGreaterThan(0);
      expect(mission.stages.analysis.prompt.trim().length).toBeGreaterThan(0);
      expect(mission.stages.evaluation.prompt.trim().length).toBeGreaterThan(0);
      expect(
        mission.stages.evaluation.edgeCaseScenario.trim().length
      ).toBeGreaterThan(0);
      expect(mission.stages.coding.prompt.trim().length).toBeGreaterThan(0);

      const rubricStages = [
        mission.stages.logic,
        mission.stages.analysis,
        mission.stages.evaluation,
      ];

      for (const stage of rubricStages) {
        expect(stage.rubricCriteria.length).toBeGreaterThanOrEqual(3);
        for (const criterion of stage.rubricCriteria) {
          expect(criterion.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('memiliki staticHints non-kosong untuk seluruh level (EXPLORER, BUILDER, ARCHITECT) pada setiap tahap', () => {
    for (const mission of MISSIONS) {
      const allStages = [
        mission.stages.logic,
        mission.stages.analysis,
        mission.stages.evaluation,
        mission.stages.coding,
      ];

      for (const stage of allStages) {
        for (const level of LEVEL_CODES) {
          expect(stage.staticHints[level].trim().length).toBeGreaterThan(0);
        }

        const uniqueHints = new Set(
          LEVEL_CODES.map((level) => stage.staticHints[level].trim())
        );
        expect(uniqueHints.size).toBe(3);
      }
    }
  });

  it('memiliki starterCode non-kosong dan minimal 5 testCases dengan minimal 1 isEdgeCase pada tahap coding', () => {
    for (const mission of MISSIONS) {
      const { starterCode, testCases } = mission.stages.coding;

      expect(starterCode.trim().length).toBeGreaterThan(0);
      expect(starterCode).not.toContain('input(');

      expect(testCases.length).toBeGreaterThanOrEqual(5);

      const hasEdgeCase = testCases.some((testCase) => testCase.isEdgeCase);
      expect(hasEdgeCase).toBe(true);

      const testCaseIds = new Set<string>();
      for (const testCase of testCases) {
        expect(testCase.id.trim().length).toBeGreaterThan(0);
        expect(testCaseIds.has(testCase.id)).toBe(false);
        testCaseIds.add(testCase.id);

        expect(testCase.label.trim().length).toBeGreaterThan(0);
        expect(testCase.harnessCode).toContain('assert ');
        expect(testCase.harnessCode).not.toContain('input(');
      }
    }
  });

  it('Misi 5 menyertakan starterCode yang sengaja mengandung 3 bug terencana (sintaks & logika)', () => {
    const mission5 = getMissionById(5);
    expect(mission5).toBeDefined();

    const starterCode = mission5?.stages.coding.starterCode ?? '';

    // Bug 1 (sintaks): baris if len(daftar_harga) == 0 tanpa titik dua (:)
    expect(starterCode).toMatch(/if len\(daftar_harga\) == 0\s*\n/);
    // Bug 2 (logika batas): operator '>' seharusnya '>=' untuk batas 100000
    expect(starterCode).toContain('if subtotal > 100000:');
    expect(starterCode).not.toContain('if subtotal >= 100000:');
    // Bug 3 (logika aritmetika): menambah diskon bukan mengurangi diskon
    expect(starterCode).toContain('return int(subtotal + total_diskon)');
    expect(starterCode).not.toContain('return int(subtotal - total_diskon)');
  });
});
