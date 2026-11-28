import 'server-only';

import { MISSIONS } from '@/lib/missions';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import type {
  MissionStage,
  MissionStatus,
  ScaffoldingLevelCode,
} from '@/lib/types/domain';

export const STAGE_ORDER: readonly MissionStage[] = [
  'logic',
  'analysis',
  'evaluation',
  'coding',
];

const ALL_MISSION_IDS = [1, 2, 3, 4, 5] as const;
type MissionId = (typeof ALL_MISSION_IDS)[number];

export interface MissionProgressRecord {
  mission_id: MissionId;
  status: MissionStatus;
  current_stage: MissionStage;
  logic_passed: boolean;
  analysis_passed: boolean;
  evaluation_passed: boolean;
  coding_passed: boolean;
  reflection_text: string | null;
  failed_eval_count: number;
  hint_count: number;
  chat_count: number;
  coding_attempts_count: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface DashboardStudentProfile {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  sekolah: string;
  initialLevel: ScaffoldingLevelCode;
  currentLevel: ScaffoldingLevelCode;
  pretestScore: number | null;
  pretestCompletedAt: string | null;
}

export interface MissionCardState {
  id: MissionId;
  slug: string;
  title: string;
  subtitle: string;
  kkaTopic: string;
  status: MissionStatus;
  currentStage: MissionStage;
  stagesCompletedCount: number;
  completedAt: string | null;
}

export interface DashboardData {
  student: DashboardStudentProfile;
  missions: MissionCardState[];
  completedCount: number;
  totalMissions: 5;
  percent: number;
}

export interface StageAccessResult {
  allowed: boolean;
  redirectUrl?: string;
  progress?: MissionProgressRecord;
}

interface StudentDashboardRow {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  sekolah: string;
  initial_level: string | null;
  current_level: string | null;
  pretest_score: number | null;
  pretest_completed_at: string | null;
}

interface RawMissionProgressRow {
  mission_id: number;
  status: string;
  current_stage: string;
  logic_passed: boolean;
  analysis_passed: boolean;
  evaluation_passed: boolean;
  coding_passed: boolean;
  reflection_text: string | null;
  failed_eval_count: number;
  hint_count: number;
  chat_count: number;
  coding_attempts_count: number;
  started_at: string | null;
  completed_at: string | null;
}

function isScaffoldingLevelCode(value: unknown): value is ScaffoldingLevelCode {
  return value === 'EXPLORER' || value === 'BUILDER' || value === 'ARCHITECT';
}

function isMissionId(value: number): value is MissionId {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isMissionStage(value: unknown): value is MissionStage {
  return (
    value === 'logic' ||
    value === 'analysis' ||
    value === 'evaluation' ||
    value === 'coding'
  );
}

function isMissionStatus(value: unknown): value is MissionStatus {
  return value === 'locked' || value === 'active' || value === 'completed';
}

function normalizeProgressRow(
  row: RawMissionProgressRow
): MissionProgressRecord | null {
  if (!isMissionId(row.mission_id)) {
    return null;
  }

  return {
    mission_id: row.mission_id,
    status: isMissionStatus(row.status) ? row.status : 'locked',
    current_stage: isMissionStage(row.current_stage)
      ? row.current_stage
      : 'logic',
    logic_passed: Boolean(row.logic_passed),
    analysis_passed: Boolean(row.analysis_passed),
    evaluation_passed: Boolean(row.evaluation_passed),
    coding_passed: Boolean(row.coding_passed),
    reflection_text: row.reflection_text ?? null,
    failed_eval_count: row.failed_eval_count ?? 0,
    hint_count: row.hint_count ?? 0,
    chat_count: row.chat_count ?? 0,
    coding_attempts_count: row.coding_attempts_count ?? 0,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
  };
}

function createDefaultProgressRecord(
  missionId: MissionId
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
  };
}

/**
 * Menentukan tahap tertinggi yang sudah terbuka secara berurutan pada sebuah misi.
 */
export function computeHighestUnlockedStage(
  progress: Pick<
    MissionProgressRecord,
    'logic_passed' | 'analysis_passed' | 'evaluation_passed' | 'coding_passed'
  >
): MissionStage {
  if (!progress.logic_passed) {
    return 'logic';
  }
  if (!progress.analysis_passed) {
    return 'analysis';
  }
  if (!progress.evaluation_passed) {
    return 'evaluation';
  }
  return 'coding';
}

/**
 * Menghitung status dinamis 5 misi secara berurutan sesuai SRS FR-03:
 * - Misi 1: completed jika tuntas, selain itu active.
 * - Misi n (2..5): completed jika tuntas, active jika Misi n-1 completed, selain itu locked.
 */
export function computeMissionCardsState(
  rows: readonly MissionProgressRecord[]
): {
  missions: MissionCardState[];
  completedCount: number;
  percent: number;
} {
  const rowByMissionId = new Map<MissionId, MissionProgressRecord>();
  for (const row of rows) {
    rowByMissionId.set(row.mission_id, row);
  }

  const missions: MissionCardState[] = [];
  let previousCompleted = true;

  for (const missionDef of MISSIONS) {
    const row =
      rowByMissionId.get(missionDef.id) ??
      createDefaultProgressRecord(missionDef.id);

    const isCompleted =
      row.status === 'completed' ||
      (row.coding_passed && row.completed_at !== null);

    let effectiveStatus: MissionStatus;
    if (isCompleted) {
      effectiveStatus = 'completed';
    } else if (missionDef.id === 1 || previousCompleted) {
      effectiveStatus = 'active';
    } else {
      effectiveStatus = 'locked';
    }

    const stagesCompletedCount =
      Number(row.logic_passed) +
      Number(row.analysis_passed) +
      Number(row.evaluation_passed) +
      Number(row.coding_passed);

    const currentStage: MissionStage =
      effectiveStatus === 'completed'
        ? 'coding'
        : computeHighestUnlockedStage(row);

    missions.push({
      id: missionDef.id,
      slug: missionDef.slug,
      title: missionDef.title,
      subtitle: missionDef.subtitle,
      kkaTopic: missionDef.kkaTopic,
      status: effectiveStatus,
      currentStage,
      stagesCompletedCount,
      completedAt: row.completed_at,
    });

    previousCompleted = effectiveStatus === 'completed';
  }

  const completedCount = missions.filter(
    (mission) => mission.status === 'completed'
  ).length;
  const percent = Math.round((completedCount / MISSIONS.length) * 100);

  return {
    missions,
    completedCount,
    percent,
  };
}

/**
 * Mengevaluasi otorisasi akses misi & tahap secara deterministik berdasarkan baris progres.
 */
export function evaluateStageAccess(
  rows: readonly MissionProgressRecord[],
  missionId: number,
  stage: MissionStage
): StageAccessResult {
  if (!isMissionId(missionId) || !isMissionStage(stage)) {
    return {
      allowed: false,
      redirectUrl: '/dashboard',
    };
  }

  const { missions } = computeMissionCardsState(rows);
  const targetCard = missions.find((mission) => mission.id === missionId);
  const targetRow =
    rows.find((row) => row.mission_id === missionId) ??
    createDefaultProgressRecord(missionId);

  if (!targetCard || targetCard.status === 'locked') {
    return {
      allowed: false,
      redirectUrl: '/dashboard',
      progress: targetRow,
    };
  }

  const highestUnlockedStage =
    targetCard.status === 'completed'
      ? 'coding'
      : computeHighestUnlockedStage(targetRow);

  const requestedIndex = STAGE_ORDER.indexOf(stage);
  const highestIndex = STAGE_ORDER.indexOf(highestUnlockedStage);

  if (requestedIndex > highestIndex) {
    return {
      allowed: false,
      redirectUrl: `/missions/${missionId}/${highestUnlockedStage}`,
      progress: targetRow,
    };
  }

  return {
    allowed: true,
    progress: {
      ...targetRow,
      status: targetCard.status,
      current_stage: highestUnlockedStage,
    },
  };
}

/**
 * Memastikan seluruh 5 baris `mission_progress` siswa tersedia di Supabase.
 * Jika ada yang hilang, membuat baris awal secara defensif (Misi 1 active, Misi 2–5 locked).
 */
export async function ensureMissionProgressRows(
  studentId: string
): Promise<MissionProgressRecord[]> {
  const supabase = getSupabaseAdmin();

  const { data: existingData, error: fetchError } = await supabase
    .from('mission_progress')
    .select(
      'mission_id, status, current_stage, logic_passed, analysis_passed, evaluation_passed, coding_passed, reflection_text, failed_eval_count, hint_count, chat_count, coding_attempts_count, started_at, completed_at'
    )
    .eq('student_id', studentId)
    .order('mission_id', { ascending: true })
    .returns<RawMissionProgressRow[]>();

  if (fetchError) {
    throw new Error(`Gagal memuat progres misi siswa: ${fetchError.message}`);
  }

  const normalized = (existingData ?? [])
    .map(normalizeProgressRow)
    .filter((row): row is MissionProgressRecord => row !== null);

  const existingIds = new Set<MissionId>(
    normalized.map((row) => row.mission_id)
  );
  const missingIds = ALL_MISSION_IDS.filter((id) => !existingIds.has(id));

  if (missingIds.length === 0) {
    return normalized;
  }

  const missingRows = missingIds.map((missionId) => ({
    student_id: studentId,
    mission_id: missionId,
    status: missionId === 1 ? 'active' : 'locked',
    current_stage: 'logic',
  }));

  const { error: upsertError } = await supabase
    .from('mission_progress')
    .upsert(missingRows, {
      onConflict: 'student_id,mission_id',
      ignoreDuplicates: true,
    });

  if (upsertError) {
    throw new Error(
      `Gagal menginisialisasi baris progres misi: ${upsertError.message}`
    );
  }

  const { data: refreshedData, error: refreshError } = await supabase
    .from('mission_progress')
    .select(
      'mission_id, status, current_stage, logic_passed, analysis_passed, evaluation_passed, coding_passed, reflection_text, failed_eval_count, hint_count, chat_count, coding_attempts_count, started_at, completed_at'
    )
    .eq('student_id', studentId)
    .order('mission_id', { ascending: true })
    .returns<RawMissionProgressRow[]>();

  if (refreshError) {
    throw new Error(
      `Gagal memuat ulang progres misi siswa: ${refreshError.message}`
    );
  }

  return (refreshedData ?? [])
    .map(normalizeProgressRow)
    .filter((row): row is MissionProgressRecord => row !== null);
}

/**
 * Mengambil seluruh data Dashboard (profil siswa + status 5 misi + persentase progres)
 * secara 100% server-side dari Supabase.
 */
export async function getDashboardData(
  studentId: string
): Promise<DashboardData | null> {
  const supabase = getSupabaseAdmin();

  const { data: studentRow, error: studentError } = await supabase
    .from('students')
    .select(
      'id, nama, nisn, kelas, sekolah, initial_level, current_level, pretest_score, pretest_completed_at'
    )
    .eq('id', studentId)
    .maybeSingle<StudentDashboardRow>();

  if (studentError) {
    throw new Error(`Gagal memuat profil siswa: ${studentError.message}`);
  }

  if (!studentRow) {
    return null;
  }

  const progressRows = await ensureMissionProgressRows(studentId);
  const { missions, completedCount, percent } =
    computeMissionCardsState(progressRows);

  const initialLevel: ScaffoldingLevelCode = isScaffoldingLevelCode(
    studentRow.initial_level
  )
    ? studentRow.initial_level
    : 'EXPLORER';

  const currentLevel: ScaffoldingLevelCode = isScaffoldingLevelCode(
    studentRow.current_level
  )
    ? studentRow.current_level
    : initialLevel;

  return {
    student: {
      id: studentRow.id,
      nama: studentRow.nama,
      nisn: studentRow.nisn.trim(),
      kelas: studentRow.kelas,
      sekolah: studentRow.sekolah,
      initialLevel,
      currentLevel,
      pretestScore: studentRow.pretest_score,
      pretestCompletedAt: studentRow.pretest_completed_at,
    },
    missions,
    completedCount,
    totalMissions: 5,
    percent,
  };
}

/**
 * Memverifikasi otorisasi akses tahap & misi dari Supabase sesuai kontrak SDD Bagian 3.1.
 */
export async function assertStageAccess(
  studentId: string,
  missionId: number,
  stage: MissionStage
): Promise<StageAccessResult> {
  if (!isMissionId(missionId) || !isMissionStage(stage)) {
    return {
      allowed: false,
      redirectUrl: '/dashboard',
    };
  }

  const progressRows = await ensureMissionProgressRows(studentId);
  return evaluateStageAccess(progressRows, missionId, stage);
}

/**
 * Mengambil level scaffolding aktif terbaru siswa langsung dari tabel `students`.
 */
export async function getStudentCurrentLevel(
  studentId: string
): Promise<ScaffoldingLevelCode | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('students')
    .select('current_level, initial_level')
    .eq('id', studentId)
    .maybeSingle<{
      current_level: string | null;
      initial_level: string | null;
    }>();

  if (error) {
    throw new Error(`Gagal memuat level siswa: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  if (isScaffoldingLevelCode(data.current_level)) {
    return data.current_level;
  }
  if (isScaffoldingLevelCode(data.initial_level)) {
    return data.initial_level;
  }
  return 'EXPLORER';
}

/**
 * Menandai tahap aktif sebagai lulus (`${stage}_passed = true`) dan memajukan
 * `current_stage` ke tahap berikutnya apabila siswa belum melewatinya.
 */
export async function markStagePassed(
  studentId: string,
  missionId: number,
  stage: MissionStage
): Promise<{ nextStage: MissionStage | null }> {
  if (!isMissionId(missionId) || !isMissionStage(stage)) {
    throw new Error('Parameter misi atau tahap tidak valid.');
  }

  const rows = await ensureMissionProgressRows(studentId);
  const currentRow = rows.find((row) => row.mission_id === missionId);

  const stageIndex = STAGE_ORDER.indexOf(stage);
  const nextStage: MissionStage | null =
    stageIndex >= 0 && stageIndex < STAGE_ORDER.length - 1
      ? STAGE_ORDER[stageIndex + 1]
      : null;

  const existingStageIndex = currentRow
    ? STAGE_ORDER.indexOf(currentRow.current_stage)
    : 0;
  const targetNextStage: MissionStage =
    nextStage && STAGE_ORDER.indexOf(nextStage) > existingStageIndex
      ? nextStage
      : (currentRow?.current_stage ?? stage);

  const passedColumn = `${stage}_passed` as
    | 'logic_passed'
    | 'analysis_passed'
    | 'evaluation_passed'
    | 'coding_passed';

  const nowIso = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('mission_progress')
    .update({
      [passedColumn]: true,
      current_stage: targetNextStage,
      started_at: currentRow?.started_at ?? nowIso,
      updated_at: nowIso,
    })
    .eq('student_id', studentId)
    .eq('mission_id', missionId);

  if (error) {
    throw new Error(`Gagal menandai kelulusan tahap ${stage}: ${error.message}`);
  }

  return { nextStage };
}

/**
 * Menyimpan draf teks/kode jawaban siswa untuk pemulihan otomatis (auto-save / sebelum evaluasi).
 */
export async function saveStageDraft(
  studentId: string,
  missionId: number,
  stage: MissionStage,
  contentText: string
): Promise<{ savedAt: string }> {
  if (!isMissionId(missionId) || !isMissionStage(stage)) {
    throw new Error('Parameter misi atau tahap tidak valid.');
  }

  const savedAt = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('stage_drafts').upsert(
    {
      student_id: studentId,
      mission_id: missionId,
      stage,
      content_text: contentText,
      updated_at: savedAt,
    },
    { onConflict: 'student_id,mission_id,stage' }
  );

  if (error) {
    throw new Error(`Gagal menyimpan draf tahap ${stage}: ${error.message}`);
  }

  return { savedAt };
}
