import 'server-only';

import { getSupabaseAdmin } from '@/lib/db/supabase-admin';

export type GeminiModelTier = 'hint' | 'mentor';

export interface KeyHealthStore {
  getCoolingDownAliases(now: Date): Promise<Set<string>>;
  markCooldown(
    alias: string,
    errorCode: number,
    cooldownMs: number,
    now: Date
  ): Promise<void>;
}

export interface GeminiExecutionResult<T> {
  result: T;
  keyAlias: string;
  modelUsed: string;
  latencyMs: number;
}

export interface IGeminiKeyPool {
  executeWithFailover<T>(
    tier: GeminiModelTier,
    task: (apiKey: string, modelName: string, keyAlias: string) => Promise<T>
  ): Promise<GeminiExecutionResult<T>>;
}

export interface GeminiKeyPoolOptions {
  keys: readonly string[];
  healthStore: KeyHealthStore;
  cooldownMs?: number;
  timeoutByTier?: Record<GeminiModelTier, number>;
  rng?: () => number;
  now?: () => Date;
}

const DEFAULT_COOLDOWN_MS = 60_000;
const DEFAULT_TIMEOUT_BY_TIER: Record<GeminiModelTier, number> = {
  hint: 8_000,
  mentor: 18_000,
};
const DEFAULT_MODEL_BY_TIER: Record<GeminiModelTier, string> = {
  hint: 'gemini-2.5-flash-lite',
  mentor: 'gemini-2.5-flash',
};

export class GeminiPoolConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiPoolConfigError';
  }
}

export class AllKeysExhaustedError extends Error {
  readonly attemptedAliases: readonly string[];

  constructor(message: string, attemptedAliases: readonly string[] = []) {
    super(message);
    this.name = 'AllKeysExhaustedError';
    this.attemptedAliases = attemptedAliases;
  }
}

class GeminiAttemptTimeoutError extends Error {
  readonly status = 503;

  constructor(keyAlias: string, timeoutMs: number) {
    super(
      `Permintaan Gemini pada ${keyAlias} melewati batas waktu (${timeoutMs}ms).`
    );
    this.name = 'GeminiAttemptTimeoutError';
  }
}

interface KeyHealthRow {
  key_alias: string;
}

interface ExistingFailureCountRow {
  failure_count: number;
}

/**
 * Implementasi produksi Shared Circuit Breaker pada tabel `public.api_key_health`.
 * Bersifat fail-open saat terjadi gangguan baca/tulis sementara ke Supabase.
 */
export class SupabaseKeyHealthStore implements KeyHealthStore {
  async getCoolingDownAliases(now: Date): Promise<Set<string>> {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('api_key_health')
        .select('key_alias')
        .gt('cooldown_until', now.toISOString())
        .returns<KeyHealthRow[]>();

      if (error) {
        console.warn(
          '[GeminiKeyPool] Gagal membaca api_key_health (fail-open):',
          error.message
        );
        return new Set<string>();
      }

      return new Set<string>((data ?? []).map((row) => row.key_alias));
    } catch (error: unknown) {
      const safeMessage =
        error instanceof Error ? error.message : 'Unknown database error';
      console.warn(
        '[GeminiKeyPool] Pengecualian saat membaca api_key_health (fail-open):',
        safeMessage
      );
      return new Set<string>();
    }
  }

  async markCooldown(
    alias: string,
    errorCode: number,
    cooldownMs: number,
    now: Date
  ): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();
      const cooldownUntil = new Date(now.getTime() + cooldownMs).toISOString();
      const updatedAt = now.toISOString();

      const { data: existingRow } = await supabase
        .from('api_key_health')
        .select('failure_count')
        .eq('key_alias', alias)
        .maybeSingle<ExistingFailureCountRow>();

      const nextFailureCount = (existingRow?.failure_count ?? 0) + 1;

      const { error: upsertError } = await supabase
        .from('api_key_health')
        .upsert(
          {
            key_alias: alias,
            cooldown_until: cooldownUntil,
            last_error_code: errorCode,
            failure_count: nextFailureCount,
            updated_at: updatedAt,
          },
          { onConflict: 'key_alias' }
        );

      if (upsertError) {
        console.warn(
          `[GeminiKeyPool] Gagal menandai cooldown untuk ${alias}:`,
          upsertError.message
        );
      }
    } catch (error: unknown) {
      const safeMessage =
        error instanceof Error ? error.message : 'Unknown database error';
      console.warn(
        `[GeminiKeyPool] Pengecualian saat menyimpan cooldown untuk ${alias}:`,
        safeMessage
      );
    }
  }
}

/**
 * Mem-parse daftar API key dari string dipisahkan koma, melakukan trim,
 * membuang entri kosong, dan deduplikasi sambil menjaga urutan.
 */
export function parseApiKeys(raw?: string): string[] {
  if (!raw || raw.trim().length === 0) {
    throw new GeminiPoolConfigError(
      'GEMINI_API_KEYS belum dikonfigurasi pada environment server.'
    );
  }

  const seen = new Set<string>();
  const keys: string[] = [];

  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (trimmed.length > 0 && !seen.has(trimmed)) {
      seen.add(trimmed);
      keys.push(trimmed);
    }
  }

  if (keys.length === 0) {
    throw new GeminiPoolConfigError(
      'GEMINI_API_KEYS tidak mengandung API key yang valid.'
    );
  }

  return keys;
}

/**
 * Memetakan tier model (`hint` vs `mentor`) ke nama model Gemini dari env dengan fallback aman.
 */
export function resolveModelName(tier: GeminiModelTier): string {
  if (tier === 'hint') {
    const envHint = process.env.GEMINI_MODEL_HINT?.trim();
    return envHint && envHint.length > 0
      ? envHint
      : DEFAULT_MODEL_BY_TIER.hint;
  }

  const envMentor = process.env.GEMINI_MODEL_MENTOR?.trim();
  return envMentor && envMentor.length > 0
    ? envMentor
    : DEFAULT_MODEL_BY_TIER.mentor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractNumericStatus(value: unknown): number | null {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 100 &&
    value <= 599
  ) {
    return value;
  }
  return null;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (isRecord(err) && typeof err.message === 'string') {
    return err.message;
  }
  return '';
}

/**
 * Mengekstrak kode status HTTP dari error SDK Google GenAI, Fetch, atau custom error.
 */
export function extractHttpStatus(err: unknown): number | null {
  if (isRecord(err)) {
    const direct =
      extractNumericStatus(err.status) ??
      extractNumericStatus(err.statusCode) ??
      extractNumericStatus(err.code);
    if (direct !== null) {
      return direct;
    }

    if (isRecord(err.response)) {
      const responseStatus = extractNumericStatus(err.response.status);
      if (responseStatus !== null) {
        return responseStatus;
      }
    }

    if (isRecord(err.error)) {
      const nestedCode =
        extractNumericStatus(err.error.code) ??
        extractNumericStatus(err.error.status);
      if (nestedCode !== null) {
        return nestedCode;
      }
    }
  }

  const message = extractErrorMessage(err);
  if (message.length === 0) {
    return null;
  }

  if (/\b429\b/.test(message) || /RESOURCE_EXHAUSTED/i.test(message)) {
    return 429;
  }
  if (/\b503\b/.test(message) || /UNAVAILABLE/i.test(message)) {
    return 503;
  }
  if (/\b400\b/.test(message)) {
    return 400;
  }

  return null;
}

/**
 * Menentukan apakah sebuah error merupakan gangguan kuota/transient yang layak di-failover.
 * Hanya HTTP 429, 503, pesan RESOURCE_EXHAUSTED/UNAVAILABLE, atau timeout percobaan.
 */
export function isFailoverError(err: unknown): boolean {
  if (err instanceof GeminiAttemptTimeoutError) {
    return true;
  }

  const status = extractHttpStatus(err);
  if (status === 429 || status === 503) {
    return true;
  }
  if (status !== null) {
    return false;
  }

  const message = extractErrorMessage(err);
  return (
    /RESOURCE_EXHAUSTED/i.test(message) ||
    /UNAVAILABLE/i.test(message) ||
    /\b429\b/.test(message) ||
    /\b503\b/.test(message)
  );
}

function scrubSecretFromError(err: unknown, rawSecret: string): unknown {
  if (
    rawSecret.length > 0 &&
    err instanceof Error &&
    err.message.includes(rawSecret)
  ) {
    const sanitized = new Error(err.message.split(rawSecret).join('[REDACTED]'));
    sanitized.name = err.name;
    const status = extractHttpStatus(err);
    if (status !== null) {
      Object.assign(sanitized, { status });
    }
    return sanitized;
  }
  return err;
}

async function withAttemptTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  keyAlias: string
): Promise<T> {
  if (timeoutMs <= 0) {
    return promise;
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new GeminiAttemptTimeoutError(keyAlias, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}

/**
 * Factory GeminiKeyPool berbasis Randomized Start + Sequential Circular Failover
 * + Shared Circuit Breaker (Algoritma 1 SDD Bagian 4.2).
 */
export function createGeminiKeyPool(
  options: GeminiKeyPoolOptions
): IGeminiKeyPool {
  const keys = options.keys.map((key) => key.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new GeminiPoolConfigError(
      'Daftar API key untuk GeminiKeyPool tidak boleh kosong.'
    );
  }

  const healthStore = options.healthStore;
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const timeoutByTier: Record<GeminiModelTier, number> = {
    hint: options.timeoutByTier?.hint ?? DEFAULT_TIMEOUT_BY_TIER.hint,
    mentor: options.timeoutByTier?.mentor ?? DEFAULT_TIMEOUT_BY_TIER.mentor,
  };
  const rng = options.rng ?? Math.random;
  const now = options.now ?? (() => new Date());

  return {
    async executeWithFailover<T>(
      tier: GeminiModelTier,
      task: (
        apiKey: string,
        modelName: string,
        keyAlias: string
      ) => Promise<T>
    ): Promise<GeminiExecutionResult<T>> {
      const requestStart = now();
      const coolingDownAliases =
        await healthStore.getCoolingDownAliases(requestStart);

      const healthyIndices: number[] = [];
      for (let i = 0; i < keys.length; i += 1) {
        if (!coolingDownAliases.has(`key_${i}`)) {
          healthyIndices.push(i);
        }
      }

      if (healthyIndices.length === 0) {
        throw new AllKeysExhaustedError(
          'Seluruh kunci API Gemini sedang dalam masa cooldown.'
        );
      }

      const rawRandom = rng();
      const clampedRandom = Number.isFinite(rawRandom)
        ? Math.min(Math.max(rawRandom, 0), 0.999999999999)
        : 0;
      const startOffset = Math.floor(clampedRandom * healthyIndices.length);

      const modelName = resolveModelName(tier);
      const timeoutMs = timeoutByTier[tier];
      const failedAliases: string[] = [];

      for (let j = 0; j < healthyIndices.length; j += 1) {
        const idx = healthyIndices[(startOffset + j) % healthyIndices.length];
        const keyAlias = `key_${idx}`;
        const apiKey = keys[idx];
        const attemptStartedMs = now().getTime();

        try {
          const result = await withAttemptTimeout(
            task(apiKey, modelName, keyAlias),
            timeoutMs,
            keyAlias
          );
          const latencyMs = Math.max(0, now().getTime() - attemptStartedMs);

          return {
            result,
            keyAlias,
            modelUsed: modelName,
            latencyMs,
          };
        } catch (error: unknown) {
          if (isFailoverError(error)) {
            const statusCode = extractHttpStatus(error) ?? 503;
            await healthStore.markCooldown(
              keyAlias,
              statusCode,
              cooldownMs,
              now()
            );
            failedAliases.push(keyAlias);
            continue;
          }

          throw scrubSecretFromError(error, apiKey);
        }
      }

      throw new AllKeysExhaustedError(
        `Seluruh kunci API Gemini gagal merespons (${failedAliases.join(', ')}).`,
        failedAliases
      );
    },
  };
}

/**
 * Helper produksi yang membuat instance GeminiKeyPool dari `process.env.GEMINI_API_KEYS`
 * menggunakan `SupabaseKeyHealthStore`.
 */
export function getGeminiKeyPool(): IGeminiKeyPool {
  const keys = parseApiKeys(process.env.GEMINI_API_KEYS);
  return createGeminiKeyPool({
    keys,
    healthStore: new SupabaseKeyHealthStore(),
  });
}
