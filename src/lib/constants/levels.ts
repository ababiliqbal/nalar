import type { ScaffoldingLevelCode } from '@/lib/types/domain';

export interface ScaffoldingLevelBadge {
  readonly colorName: 'teal' | 'amber' | 'blue';
  readonly bgHex: string;
  readonly textHex: string;
  readonly borderHex: string;
  readonly className: string;
}

export interface ScaffoldingLevelConfig {
  readonly code: ScaffoldingLevelCode;
  readonly rank: 1 | 2 | 3;
  readonly label: string;
  readonly minScore: number;
  readonly maxScore: number;
  readonly description: string;
  readonly badge: ScaffoldingLevelBadge;
}

export const SCAFFOLDING_LEVELS = {
  EXPLORER: {
    code: 'EXPLORER',
    rank: 1,
    label: 'Level 1: Explorer',
    minScore: 0,
    maxScore: 2,
    description:
      'AI membimbing langkah demi langkah dengan analogi sederhana dan contoh terarah untuk memperkuat dasar logika.',
    badge: {
      colorName: 'teal',
      bgHex: '#F0FDFA',
      textHex: '#0F766E',
      borderHex: '#99F6E4',
      className: 'bg-teal-50 text-teal-700 border-teal-200',
    },
  },
  BUILDER: {
    code: 'BUILDER',
    rank: 2,
    label: 'Level 2: Builder',
    minScore: 3,
    maxScore: 4,
    description:
      'AI memberi pertanyaan pemantik terstruktur dan petunjuk parsial agar kamu menyusun pola algoritma secara mandiri.',
    badge: {
      colorName: 'amber',
      bgHex: '#FFFBEB',
      textHex: '#D97706',
      borderHex: '#FDE68A',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  },
  ARCHITECT: {
    code: 'ARCHITECT',
    rank: 3,
    label: 'Level 3: Architect',
    minScore: 5,
    maxScore: 6,
    description:
      'AI memberi tantangan analitis ringkas yang berfokus pada kasus ekstrem (edge case) dan efisiensi algoritma.',
    badge: {
      colorName: 'blue',
      bgHex: '#EFF6FF',
      textHex: '#2563EB',
      borderHex: '#BFDBFE',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  },
} as const satisfies Record<ScaffoldingLevelCode, ScaffoldingLevelConfig>;

/**
 * Memetakan skor pretest (0-6) secara deterministik ke kode level scaffolding kanonik.
 * - 0..2 -> EXPLORER
 * - 3..4 -> BUILDER
 * - 5..6 -> ARCHITECT
 */
export function mapScoreToLevel(score: number): ScaffoldingLevelCode {
  if (!Number.isFinite(score)) {
    return 'EXPLORER';
  }

  if (score >= SCAFFOLDING_LEVELS.ARCHITECT.minScore) {
    return 'ARCHITECT';
  }

  if (score >= SCAFFOLDING_LEVELS.BUILDER.minScore) {
    return 'BUILDER';
  }

  return 'EXPLORER';
}
