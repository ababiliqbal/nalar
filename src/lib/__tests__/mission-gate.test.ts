import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  assertStageAccess,
  computeMissionCardsState,
  evaluateStageAccess,
  type MissionProgressRecord,
} from '@/lib/services/mission-gate.service';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';

vi.mock('@/lib/db/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

function makeRow(
  missionId: 1 | 2 | 3 | 4 | 5,
  overrides: Partial<MissionProgressRecord> = {}
): MissionProgressRecord {
  return {
    mission_id: missionId,
    status: missionId === 1 ? 'active' : 'locked',
    current_stage: 'logic',
    logic_passed: false,
    analysis_passed: false,
    evaluation_passed: false,
    coding_passed: false,
    reflection_text: null,
    failed_eval_count: 0,
    hint_count: 0,
    chat_count: 0,
    coding_attempts_count: 0,
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}

function makeInitialProgress(): MissionProgressRecord[] {
  return [makeRow(1), makeRow(2), makeRow(3), makeRow(4), makeRow(5)];
}

describe('mission-gate.service.ts — Perhitungan Status Misi Berurutan', () => {
  it('membuka Misi 1 dan mengunci Misi 2–5 pada kondisi awal (0%)', () => {
    const { missions, completedCount, percent } = computeMissionCardsState(
      makeInitialProgress()
    );

    expect(missions.map((m) => m.status)).toEqual([
      'active',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
    expect(missions[0]?.currentStage).toBe('logic');
    expect(completedCount).toBe(0);
    expect(percent).toBe(0);
  });

  it('membuka Misi 2 otomatis segera setelah Misi 1 berstatus completed (20%)', () => {
    const rows = makeInitialProgress();
    rows[0] = makeRow(1, {
      status: 'completed',
      current_stage: 'coding',
      logic_passed: true,
      analysis_passed: true,
      evaluation_passed: true,
      coding_passed: true,
      completed_at: '2026-11-26T08:00:00.000Z',
    });

    const { missions, completedCount, percent } =
      computeMissionCardsState(rows);

    expect(missions.map((m) => m.status)).toEqual([
      'completed',
      'active',
      'locked',
      'locked',
      'locked',
    ]);
    expect(missions[1]?.currentStage).toBe('logic');
    expect(completedCount).toBe(1);
    expect(percent).toBe(20);
  });

  it('menghitung progres 100% ketika seluruh 5 misi telah tuntas', () => {
    const allCompleted = ([1, 2, 3, 4, 5] as const).map((id) =>
      makeRow(id, {
        status: 'completed',
        current_stage: 'coding',
        logic_passed: true,
        analysis_passed: true,
        evaluation_passed: true,
        coding_passed: true,
        completed_at: '2026-11-26T09:00:00.000Z',
      })
    );

    const { missions, completedCount, percent } =
      computeMissionCardsState(allCompleted);

    expect(missions.every((m) => m.status === 'completed')).toBe(true);
    expect(completedCount).toBe(5);
    expect(percent).toBe(100);
  });
});

describe('mission-gate.service.ts — Stage Gating & assertStageAccess', () => {
  it('menolak lompat langsung ke tahap coding saat logic belum lulus dan mengarahkan ke tahap terbuka', () => {
    const rows = makeInitialProgress();

    const jumpToCoding = evaluateStageAccess(rows, 1, 'coding');
    expect(jumpToCoding.allowed).toBe(false);
    expect(jumpToCoding.redirectUrl).toBe('/missions/1/logic');

    const accessLogic = evaluateStageAccess(rows, 1, 'logic');
    expect(accessLogic.allowed).toBe(true);
  });

  it('mengizinkan meninjau tahap sebelumnya tetapi menolak lompat ke tahap belum terbuka', () => {
    const rows = makeInitialProgress();
    rows[0] = makeRow(1, {
      status: 'active',
      current_stage: 'evaluation',
      logic_passed: true,
      analysis_passed: true,
      evaluation_passed: false,
      coding_passed: false,
    });

    // Boleh meninjau tahap sebelumnya (logic) & tahap aktif (evaluation)
    expect(evaluateStageAccess(rows, 1, 'logic').allowed).toBe(true);
    expect(evaluateStageAccess(rows, 1, 'analysis').allowed).toBe(true);
    expect(evaluateStageAccess(rows, 1, 'evaluation').allowed).toBe(true);

    // Tidak boleh melompat ke coding sebelum evaluation lulus
    const jumpToCoding = evaluateStageAccess(rows, 1, 'coding');
    expect(jumpToCoding.allowed).toBe(false);
    expect(jumpToCoding.redirectUrl).toBe('/missions/1/evaluation');
  });

  it('menolak akses ke misi yang masih terkunci dan mengarahkan ke /dashboard', () => {
    const rows = makeInitialProgress();

    const lockedMission2 = evaluateStageAccess(rows, 2, 'logic');
    expect(lockedMission2.allowed).toBe(false);
    expect(lockedMission2.redirectUrl).toBe('/dashboard');

    const invalidMission = evaluateStageAccess(rows, 99, 'logic');
    expect(invalidMission.allowed).toBe(false);
    expect(invalidMission.redirectUrl).toBe('/dashboard');
  });

  it('assertStageAccess memverifikasi akses dari data Supabase dan menolak lompat tahap / misi terkunci', async () => {
    const mockedRows = makeInitialProgress();
    mockedRows[0] = makeRow(1, {
      status: 'active',
      current_stage: 'analysis',
      logic_passed: true,
    });

    const mockOrder = vi.fn().mockReturnValue({
      returns: vi.fn().mockResolvedValue({ data: mockedRows, error: null }),
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof getSupabaseAdmin>);

    const allowedAnalysis = await assertStageAccess(
      'student-uuid-1',
      1,
      'analysis'
    );
    expect(allowedAnalysis.allowed).toBe(true);

    const blockedEvaluation = await assertStageAccess(
      'student-uuid-1',
      1,
      'evaluation'
    );
    expect(blockedEvaluation.allowed).toBe(false);
    expect(blockedEvaluation.redirectUrl).toBe('/missions/1/analysis');

    const blockedMission3 = await assertStageAccess(
      'student-uuid-1',
      3,
      'logic'
    );
    expect(blockedMission3.allowed).toBe(false);
    expect(blockedMission3.redirectUrl).toBe('/dashboard');
  });
});
