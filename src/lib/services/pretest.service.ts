import 'server-only';

import { SCAFFOLDING_LEVELS } from '@/lib/constants/levels';
import {
  getPublicPretestQuestions,
  gradePretestAnswers,
} from '@/lib/constants/pretest-bank';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import type {
  PretestQuestionPublic,
  ScaffoldingLevelCode,
} from '@/lib/types/domain';
import type { PretestAnswersInput } from '@/lib/validation/schemas';

export class PretestAlreadyCompletedError extends Error {
  constructor(
    message = 'Pretest sudah pernah diselesaikan dan tidak dapat diulang.'
  ) {
    super(message);
    this.name = 'PretestAlreadyCompletedError';
  }
}

export class PretestStudentNotFoundError extends Error {
  constructor(message = 'Data siswa tidak ditemukan.') {
    super(message);
    this.name = 'PretestStudentNotFoundError';
  }
}

export interface PretestStudentSummary {
  id: string;
  nama: string;
  kelas: string;
  sekolah: string;
}

export type PretestStateResult =
  | {
      completed: true;
      student: PretestStudentSummary;
      assignedLevel: ScaffoldingLevelCode | null;
      score: number | null;
    }
  | {
      completed: false;
      student: PretestStudentSummary;
      questions: PretestQuestionPublic[];
    };

export interface SubmitPretestResult {
  score: number;
  total: 6;
  level: ScaffoldingLevelCode;
  label: string;
  description: string;
}

interface StudentPretestRow {
  id: string;
  nama: string;
  kelas: string;
  sekolah: string;
  current_level: string | null;
  pretest_score: number | null;
  pretest_completed_at: string | null;
}

function isScaffoldingLevelCode(value: unknown): value is ScaffoldingLevelCode {
  return value === 'EXPLORER' || value === 'BUILDER' || value === 'ARCHITECT';
}

/**
 * Memeriksa status penyelesaian pretest siswa.
 * Jika belum selesai, mengembalikan 6 soal publik (tanpa kunci jawaban).
 */
export async function getPretestStateForStudent(
  studentId: string
): Promise<PretestStateResult | null> {
  const supabase = getSupabaseAdmin();

  const { data: student, error } = await supabase
    .from('students')
    .select(
      'id, nama, kelas, sekolah, current_level, pretest_score, pretest_completed_at'
    )
    .eq('id', studentId)
    .maybeSingle<StudentPretestRow>();

  if (error) {
    throw new Error(`Gagal memuat status pretest siswa: ${error.message}`);
  }

  if (!student) {
    return null;
  }

  const summary: PretestStudentSummary = {
    id: student.id,
    nama: student.nama,
    kelas: student.kelas,
    sekolah: student.sekolah,
  };

  if (student.pretest_completed_at !== null) {
    return {
      completed: true,
      student: summary,
      assignedLevel: isScaffoldingLevelCode(student.current_level)
        ? student.current_level
        : null,
      score: student.pretest_score,
    };
  }

  return {
    completed: false,
    student: summary,
    questions: getPublicPretestQuestions(),
  };
}

/**
 * Menilai pretest di sisi server secara deterministik, menerapkan anti-retake,
 * menyimpan rekaman ke `pretest_attempts`, dan memperbarui level awal di `students`.
 */
export async function submitPretest(
  studentId: string,
  answers: PretestAnswersInput,
  durationSec: number
): Promise<SubmitPretestResult> {
  const supabase = getSupabaseAdmin();

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, pretest_completed_at')
    .eq('id', studentId)
    .maybeSingle<{ id: string; pretest_completed_at: string | null }>();

  if (studentError) {
    throw new Error(`Gagal memverifikasi profil siswa: ${studentError.message}`);
  }

  if (!student) {
    throw new PretestStudentNotFoundError();
  }

  if (student.pretest_completed_at !== null) {
    throw new PretestAlreadyCompletedError();
  }

  const { data: existingAttempt, error: attemptLookupError } = await supabase
    .from('pretest_attempts')
    .select('id')
    .eq('student_id', studentId)
    .maybeSingle<{ id: string }>();

  if (attemptLookupError) {
    throw new Error(
      `Gagal memeriksa riwayat pretest: ${attemptLookupError.message}`
    );
  }

  if (existingAttempt) {
    throw new PretestAlreadyCompletedError();
  }

  const graded = gradePretestAnswers(answers);
  const safeDurationSec = Math.max(0, Math.floor(durationSec));
  const nowIso = new Date().toISOString();

  const { error: insertAttemptError } = await supabase
    .from('pretest_attempts')
    .insert({
      student_id: studentId,
      answers_json: answers,
      score: graded.score,
      assigned_level: graded.level,
      duration_sec: safeDurationSec,
    });

  if (insertAttemptError) {
    if (insertAttemptError.code === '23505') {
      throw new PretestAlreadyCompletedError();
    }
    throw new Error(
      `Gagal menyimpan hasil pretest: ${insertAttemptError.message}`
    );
  }

  const { error: updateStudentError } = await supabase
    .from('students')
    .update({
      initial_level: graded.level,
      current_level: graded.level,
      pretest_score: graded.score,
      pretest_completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', studentId);

  if (updateStudentError) {
    throw new Error(
      `Gagal memperbarui level awal siswa: ${updateStudentError.message}`
    );
  }

  const levelMeta = SCAFFOLDING_LEVELS[graded.level];

  return {
    score: graded.score,
    total: graded.total,
    level: graded.level,
    label: levelMeta.label,
    description: levelMeta.description,
  };
}
