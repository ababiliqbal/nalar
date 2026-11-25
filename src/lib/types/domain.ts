export type ScaffoldingLevelCode = 'EXPLORER' | 'BUILDER' | 'ARCHITECT';

export type MissionStage = 'logic' | 'analysis' | 'evaluation' | 'coding';

export type MissionStatus = 'locked' | 'active' | 'completed';

export interface SessionPayload {
  studentId: string;
  currentLevel: ScaffoldingLevelCode;
  pretestCompleted: boolean;
  iat: number;
  exp: number;
}

export interface PythonTestCase {
  id: string;
  label: string;
  isEdgeCase: boolean;
  /** Kode Python setup variabel & assertion yang dieksekusi setelah kode siswa */
  harnessCode: string;
  expectedOutput?: string;
}

export interface MissionDefinition {
  id: 1 | 2 | 3 | 4 | 5;
  slug: string;
  title: string;
  subtitle: string;
  kkaTopic: string;
  caseNarrative: string;
  stages: {
    logic: {
      prompt: string;
      rubricCriteria: string[];
      staticHints: Record<ScaffoldingLevelCode, string>;
    };
    analysis: {
      prompt: string;
      rubricCriteria: string[];
      staticHints: Record<ScaffoldingLevelCode, string>;
    };
    evaluation: {
      prompt: string;
      edgeCaseScenario: string;
      rubricCriteria: string[];
      staticHints: Record<ScaffoldingLevelCode, string>;
    };
    coding: {
      prompt: string;
      starterCode: string;
      testCases: PythonTestCase[];
      staticHints: Record<ScaffoldingLevelCode, string>;
    };
  };
  reflectionQuestion: string;
}

export interface RubricEvaluationResult {
  criteria_met: string[];
  missing_points: string[];
  feedback_message: string;
  is_passed: boolean;
}

export type PretestOptionKey = 'A' | 'B' | 'C' | 'D';

export type PretestCategory =
  | 'Urutan Langkah'
  | 'Percabangan IF-ELSE'
  | 'Penelusuran Variabel';

export interface PretestOption {
  key: PretestOptionKey;
  label: string;
}

export interface PretestQuestionInternal {
  id: string;
  number: 1 | 2 | 3 | 4 | 5 | 6;
  category: PretestCategory;
  question: string;
  codeSnippet?: string;
  options: readonly PretestOption[];
  answer: PretestOptionKey;
}

export type PretestQuestionPublic = Omit<PretestQuestionInternal, 'answer'>;

export interface PretestGradeResult {
  score: number;
  total: 6;
  level: ScaffoldingLevelCode;
}
