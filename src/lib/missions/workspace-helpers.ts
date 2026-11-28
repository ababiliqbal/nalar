import type { MissionDefinition, MissionStage } from '@/lib/types/domain';

export const STAGE_ORDER = [
  'logic',
  'analysis',
  'evaluation',
  'coding',
] as const;

export type MissionId = 1 | 2 | 3 | 4 | 5;

export interface StageMetaItem {
  readonly stage: MissionStage;
  readonly stepNumber: 1 | 2 | 3 | 4;
  readonly shortLabel: string;
  readonly label: string;
  readonly title: string;
}

export const STAGE_META: Readonly<Record<MissionStage, StageMetaItem>> = {
  logic: {
    stage: 'logic',
    stepNumber: 1,
    shortLabel: 'Logic',
    label: '1. Logic',
    title: 'Penalaran Bahasa Sehari-hari',
  },
  analysis: {
    stage: 'analysis',
    stepNumber: 2,
    shortLabel: 'Analysis',
    label: '2. Analysis',
    title: 'Pseudocode Terstruktur',
  },
  evaluation: {
    stage: 'evaluation',
    stepNumber: 3,
    shortLabel: 'Evaluation',
    label: '3. Evaluation',
    title: 'Uji Kasus Ekstrem & Efisiensi',
  },
  coding: {
    stage: 'coding',
    stepNumber: 4,
    shortLabel: 'Coding',
    label: '4. Coding',
    title: 'Implementasi Python & Unit Test',
  },
};

export interface ParsedMissionRouteParams {
  missionId: MissionId;
  stage: MissionStage;
}

export interface PublicMissionStagePayload {
  missionId: MissionId;
  title: string;
  subtitle: string;
  kkaTopic: string;
  caseNarrative: string;
  stage: MissionStage;
  stagePrompt: string;
  edgeCaseScenario?: string;
  starterCode?: string;
  reflectionQuestion: string;
}

export interface StagePassFlags {
  logic_passed: boolean;
  analysis_passed: boolean;
  evaluation_passed: boolean;
  coding_passed: boolean;
}

export type StepperStageVisualState =
  | 'passed'
  | 'active'
  | 'unlocked'
  | 'locked';

export interface StepperStageItem {
  stage: MissionStage;
  stepNumber: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  state: StepperStageVisualState;
  isClickable: boolean;
}

function isStageValue(value: string): value is MissionStage {
  return (STAGE_ORDER as readonly string[]).includes(value);
}

/**
 * Memvalidasi parameter rute `/missions/[missionId]/[stage]` secara ketat.
 * Hanya menerima integer tepat 1..5 dan stage dalam STAGE_ORDER.
 */
export function parseMissionRouteParams(
  missionIdRaw: string,
  stageRaw: string
): ParsedMissionRouteParams | null {
  if (!/^[1-5]$/.test(missionIdRaw)) {
    return null;
  }

  if (!isStageValue(stageRaw)) {
    return null;
  }

  const missionId = Number(missionIdRaw) as MissionId;
  return {
    missionId,
    stage: stageRaw,
  };
}

/**
 * Memproyeksikan hanya field publik aman ke Client Component / RSC payload.
 * Sengaja membuang `rubricCriteria`, `staticHints`, dan `testCases`.
 */
export function buildPublicStagePayload(
  mission: MissionDefinition,
  stage: MissionStage
): PublicMissionStagePayload {
  const basePayload: PublicMissionStagePayload = {
    missionId: mission.id,
    title: mission.title,
    subtitle: mission.subtitle,
    kkaTopic: mission.kkaTopic,
    caseNarrative: mission.caseNarrative,
    stage,
    stagePrompt: mission.stages[stage].prompt,
    reflectionQuestion: mission.reflectionQuestion,
  };

  if (stage === 'evaluation') {
    basePayload.edgeCaseScenario = mission.stages.evaluation.edgeCaseScenario;
  }

  if (stage === 'coding') {
    basePayload.starterCode = mission.stages.coding.starterCode;
  }

  return basePayload;
}

/**
 * Menghitung status visual dan status klik untuk 4 tahap pada WorkspaceHeader stepper.
 */
export function computeStepperStates(
  progress: StagePassFlags,
  activeStage: MissionStage
): StepperStageItem[] {
  const unlockedByStage: Record<MissionStage, boolean> = {
    logic: true,
    analysis: progress.logic_passed,
    evaluation: progress.logic_passed && progress.analysis_passed,
    coding:
      progress.logic_passed &&
      progress.analysis_passed &&
      progress.evaluation_passed,
  };

  const passedByStage: Record<MissionStage, boolean> = {
    logic: progress.logic_passed,
    analysis: progress.analysis_passed,
    evaluation: progress.evaluation_passed,
    coding: progress.coding_passed,
  };

  return STAGE_ORDER.map((stage) => {
    const meta = STAGE_META[stage];
    const isActive = stage === activeStage;
    const isPassed = passedByStage[stage];
    const isUnlocked = unlockedByStage[stage];

    let state: StepperStageVisualState;
    let isClickable: boolean;

    if (isActive) {
      state = 'active';
      isClickable = true;
    } else if (isPassed) {
      state = 'passed';
      isClickable = true;
    } else if (isUnlocked) {
      state = 'unlocked';
      isClickable = true;
    } else {
      state = 'locked';
      isClickable = false;
    }

    return {
      stage,
      stepNumber: meta.stepNumber,
      label: meta.label,
      shortLabel: meta.shortLabel,
      state,
      isClickable,
    };
  });
}
