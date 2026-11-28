import { describe, expect, it } from 'vitest';

import { MISSIONS } from '@/lib/missions';
import {
  STAGE_ORDER,
  buildPublicStagePayload,
  computeStepperStates,
  parseMissionRouteParams,
} from '@/lib/missions/workspace-helpers';

describe('workspace-helpers.ts — Validasi Params, DTO Aman, & Stepper State', () => {
  describe('parseMissionRouteParams', () => {
    it('menerima seluruh kombinasi valid 1..5 dan logic/analysis/evaluation/coding', () => {
      for (const missionId of [1, 2, 3, 4, 5] as const) {
        for (const stage of STAGE_ORDER) {
          expect(parseMissionRouteParams(String(missionId), stage)).toEqual({
            missionId,
            stage,
          });
        }
      }
    });

    it('menolak missionId di luar 1..5, desimal, non-angka, atau stage tidak dikenal', () => {
      expect(parseMissionRouteParams('0', 'logic')).toBeNull();
      expect(parseMissionRouteParams('6', 'logic')).toBeNull();
      expect(parseMissionRouteParams('1.5', 'logic')).toBeNull();
      expect(parseMissionRouteParams('abc', 'logic')).toBeNull();
      expect(parseMissionRouteParams('01', 'logic')).toBeNull();
      expect(parseMissionRouteParams('1', 'unknown')).toBeNull();
      expect(parseMissionRouteParams('1', 'LOGIC')).toBeNull();
    });
  });

  describe('buildPublicStagePayload', () => {
    it('membuang rubricCriteria, staticHints, dan testCases pada seluruh misi & tahap', () => {
      for (const mission of MISSIONS) {
        for (const stage of STAGE_ORDER) {
          const payload = buildPublicStagePayload(mission, stage);

          expect(payload.missionId).toBe(mission.id);
          expect(payload.stage).toBe(stage);
          expect(payload.stagePrompt).toBe(mission.stages[stage].prompt);
          expect(payload.caseNarrative).toBe(mission.caseNarrative);

          const rawRecord = payload as unknown as Record<string, unknown>;
          expect('rubricCriteria' in rawRecord).toBe(false);
          expect('staticHints' in rawRecord).toBe(false);
          expect('testCases' in rawRecord).toBe(false);
          expect('stages' in rawRecord).toBe(false);

          if (stage === 'evaluation') {
            expect(payload.edgeCaseScenario).toBe(
              mission.stages.evaluation.edgeCaseScenario
            );
          } else {
            expect(payload.edgeCaseScenario).toBeUndefined();
          }

          if (stage === 'coding') {
            expect(payload.starterCode).toBe(mission.stages.coding.starterCode);
          } else {
            expect(payload.starterCode).toBeUndefined();
          }
        }
      }
    });
  });

  describe('computeStepperStates', () => {
    it('baru membuka Misi 1: hanya Logic aktif & clickable, tiga tahap lainnya locked non-clickable', () => {
      const items = computeStepperStates(
        {
          logic_passed: false,
          analysis_passed: false,
          evaluation_passed: false,
          coding_passed: false,
        },
        'logic'
      );

      expect(items.map((item) => item.state)).toEqual([
        'active',
        'locked',
        'locked',
        'locked',
      ]);
      expect(items.map((item) => item.isClickable)).toEqual([
        true,
        false,
        false,
        false,
      ]);
    });

    it('sudah lulus Logic & Analysis dan berada di Evaluation: Logic & Analysis passed clickable, Evaluation aktif, Coding terkunci', () => {
      const items = computeStepperStates(
        {
          logic_passed: true,
          analysis_passed: true,
          evaluation_passed: false,
          coding_passed: false,
        },
        'evaluation'
      );

      expect(items.map((item) => item.state)).toEqual([
        'passed',
        'passed',
        'active',
        'locked',
      ]);
      expect(items.map((item) => item.isClickable)).toEqual([
        true,
        true,
        true,
        false,
      ]);
    });

    it('meninjau kembali Logic saat sudah membuka Evaluation: Logic aktif, Analysis passed, Evaluation unlocked clickable, Coding terkunci', () => {
      const items = computeStepperStates(
        {
          logic_passed: true,
          analysis_passed: true,
          evaluation_passed: false,
          coding_passed: false,
        },
        'logic'
      );

      expect(items.map((item) => item.state)).toEqual([
        'active',
        'passed',
        'unlocked',
        'locked',
      ]);
      expect(items.map((item) => item.isClickable)).toEqual([
        true,
        true,
        true,
        false,
      ]);
    });
  });
});
