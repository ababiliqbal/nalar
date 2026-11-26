import 'server-only';

import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import type {
  ScaffoldingLevelCode,
  SessionPayload,
} from '@/lib/types/domain';
import type { AuthSessionInput } from '@/lib/validation/schemas';

export const SESSION_COOKIE_NAME = 'nalar_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 hari
export const GENERIC_AUTH_ERROR_MESSAGE =
  'Kombinasi identitas atau PIN tidak sesuai';

const SCRYPT_KEY_LENGTH = 64;
const SALT_BYTE_LENGTH = 16;
const HEX_PATTERN = /^[0-9a-f]+$/i;

export class AuthCredentialsError extends Error {
  constructor(message = GENERIC_AUTH_ERROR_MESSAGE) {
    super(message);
    this.name = 'AuthCredentialsError';
  }
}

export interface AuthenticateOrRegisterResult {
  studentId: string;
  isNewUser: boolean;
  redirectTo: '/pretest' | '/dashboard';
  token: string;
}

interface StudentAuthRow {
  id: string;
  pin_hash: string;
  current_level: string | null;
  pretest_completed_at: string | null;
}

function getSessionSecretBytes(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error(
      'Konfigurasi server tidak lengkap: SESSION_SECRET wajib diatur (minimal 16 karakter).'
    );
  }
  return new TextEncoder().encode(secret);
}

function isScaffoldingLevelCode(value: unknown): value is ScaffoldingLevelCode {
  return value === 'EXPLORER' || value === 'BUILDER' || value === 'ARCHITECT';
}

/**
 * Menghasilkan hash deterministik SHA-256 dari kombinasi NISN + nama sekolah ternormalisasi.
 */
export function computeIdentityKeyHash(nisn: string, sekolah: string): string {
  const normalizedNisn = nisn.trim();
  const normalizedSchool = sekolah.trim().toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256')
    .update(`${normalizedNisn}:${normalizedSchool}`, 'utf8')
    .digest('hex');
}

/**
 * Menghasilkan hash PIN 4 digit menggunakan scrypt + random salt 16 byte.
 * Format: "<saltHex>:<derivedHashHex>"
 */
export function hashPin(pin: string): string {
  const saltHex = randomBytes(SALT_BYTE_LENGTH).toString('hex');
  const derivedHex = scryptSync(pin, saltHex, SCRYPT_KEY_LENGTH).toString(
    'hex'
  );
  return `${saltHex}:${derivedHex}`;
}

/**
 * Memverifikasi PIN terhadap hash tersimpan dengan perbandingan constant-time (timingSafeEqual).
 */
export function verifyPin(pin: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [saltHex, expectedHashHex] = parts;
  if (
    saltHex.length === 0 ||
    expectedHashHex.length === 0 ||
    expectedHashHex.length % 2 !== 0 ||
    !HEX_PATTERN.test(expectedHashHex)
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHashHex, 'hex');
  const derivedBuffer = scryptSync(pin, saltHex, SCRYPT_KEY_LENGTH);

  if (derivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedBuffer, expectedBuffer);
}

/**
 * Menandatangani JWT sesi siswa menggunakan HS256 dengan masa berlaku 7 hari.
 */
export async function signSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>
): Promise<string> {
  const secretKey = getSessionSecretBytes();

  return new SignJWT({
    studentId: payload.studentId,
    currentLevel: payload.currentLevel,
    pretestCompleted: payload.pretestCompleted,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey);
}

/**
 * Memverifikasi token JWT sesi dan mengembalikan SessionPayload tervalidasi atau null.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  if (!token || token.trim().length === 0) {
    return null;
  }

  try {
    const secretKey = getSessionSecretBytes();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    const studentId = payload.studentId;
    const currentLevel = payload.currentLevel;
    const pretestCompleted = payload.pretestCompleted;
    const iat = payload.iat;
    const exp = payload.exp;

    if (
      typeof studentId !== 'string' ||
      studentId.length === 0 ||
      !isScaffoldingLevelCode(currentLevel) ||
      typeof pretestCompleted !== 'boolean' ||
      typeof iat !== 'number' ||
      typeof exp !== 'number'
    ) {
      return null;
    }

    return {
      studentId,
      currentLevel,
      pretestCompleted,
      iat,
      exp,
    };
  } catch {
    return null;
  }
}

/**
 * Membaca dan memverifikasi cookie sesi HttpOnly `nalar_session` pada sisi server.
 */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

/**
 * Mendaftarkan siswa baru atau memulihkan sesi siswa lama secara aman di server.
 */
export async function authenticateOrRegister(
  input: AuthSessionInput
): Promise<AuthenticateOrRegisterResult> {
  const supabase = getSupabaseAdmin();
  const identityKeyHash = computeIdentityKeyHash(input.nisn, input.sekolah);

  const { data: existingStudent, error: lookupError } = await supabase
    .from('students')
    .select('id, pin_hash, current_level, pretest_completed_at')
    .eq('identity_key_hash', identityKeyHash)
    .maybeSingle<StudentAuthRow>();

  if (lookupError) {
    throw new Error(`Gagal memeriksa identitas siswa: ${lookupError.message}`);
  }

  if (existingStudent) {
    const isPinValid = verifyPin(input.pin, existingStudent.pin_hash);
    if (!isPinValid) {
      throw new AuthCredentialsError(GENERIC_AUTH_ERROR_MESSAGE);
    }

    const pretestCompleted = existingStudent.pretest_completed_at !== null;
    const currentLevel: ScaffoldingLevelCode = isScaffoldingLevelCode(
      existingStudent.current_level
    )
      ? existingStudent.current_level
      : 'EXPLORER';

    const token = await signSessionToken({
      studentId: existingStudent.id,
      currentLevel,
      pretestCompleted,
    });

    return {
      studentId: existingStudent.id,
      isNewUser: false,
      redirectTo: pretestCompleted ? '/dashboard' : '/pretest',
      token,
    };
  }

  const pinHash = hashPin(input.pin);
  const consentAt = new Date().toISOString();

  const { data: createdStudent, error: createError } = await supabase
    .from('students')
    .insert({
      identity_key_hash: identityKeyHash,
      nama: input.nama.trim(),
      nisn: input.nisn.trim(),
      kelas: input.kelas.trim(),
      sekolah: input.sekolah.trim(),
      pin_hash: pinHash,
      consent_at: consentAt,
    })
    .select('id')
    .single<{ id: string }>();

  if (createError || !createdStudent) {
    throw new Error(
      `Gagal menyimpan profil siswa baru: ${createError?.message ?? 'Data tidak dikembalikan'}`
    );
  }

  const initialMissionRows = ([1, 2, 3, 4, 5] as const).map((missionId) => ({
    student_id: createdStudent.id,
    mission_id: missionId,
    status: missionId === 1 ? 'active' : 'locked',
    current_stage: 'logic',
  }));

  const { error: progressError } = await supabase
    .from('mission_progress')
    .insert(initialMissionRows);

  if (progressError) {
    await supabase.from('students').delete().eq('id', createdStudent.id);
    throw new Error(
      `Gagal menginisialisasi progres 5 misi: ${progressError.message}`
    );
  }

  const token = await signSessionToken({
    studentId: createdStudent.id,
    currentLevel: 'EXPLORER',
    pretestCompleted: false,
  });

  return {
    studentId: createdStudent.id,
    isNewUser: true,
    redirectTo: '/pretest',
    token,
  };
}
