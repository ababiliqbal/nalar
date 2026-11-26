import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  AllKeysExhaustedError,
  GeminiPoolConfigError,
  createGeminiKeyPool,
  parseApiKeys,
  resolveModelName,
  type KeyHealthStore,
} from '@/lib/ai/gemini-pool';

interface HealthEntry {
  cooldownUntilMs: number;
  lastErrorCode: number;
  failureCount: number;
}

class InMemoryKeyHealthStore implements KeyHealthStore {
  readonly entries = new Map<string, HealthEntry>();

  async getCoolingDownAliases(now: Date): Promise<Set<string>> {
    const active = new Set<string>();
    const nowMs = now.getTime();

    for (const [alias, entry] of this.entries.entries()) {
      if (entry.cooldownUntilMs > nowMs) {
        active.add(alias);
      }
    }

    return active;
  }

  async markCooldown(
    alias: string,
    errorCode: number,
    cooldownMs: number,
    now: Date
  ): Promise<void> {
    const previous = this.entries.get(alias);
    this.entries.set(alias, {
      cooldownUntilMs: now.getTime() + cooldownMs,
      lastErrorCode: errorCode,
      failureCount: (previous?.failureCount ?? 0) + 1,
    });
  }
}

const FAKE_KEYS = [
  'AIzaSyFakeKeyAlpha0000000000000001',
  'AIzaSyFakeKeyBravo0000000000000002',
  'AIzaSyFakeKeyCharlie00000000000003',
] as const;

describe('gemini-pool.ts — Serverless Key Pool & Shared Circuit Breaker', () => {
  it('1. berhasil di percobaan pertama dan mengembalikan { result, keyAlias, modelUsed, latencyMs }', async () => {
    const healthStore = new InMemoryKeyHealthStore();
    let currentMs = 1_700_000_000_000;

    const pool = createGeminiKeyPool({
      keys: FAKE_KEYS,
      healthStore,
      rng: () => 0.0,
      now: () => new Date(currentMs),
    });

    const response = await pool.executeWithFailover(
      'hint',
      async (apiKey, modelName, keyAlias) => {
        expect(apiKey).toBe(FAKE_KEYS[0]);
        expect(keyAlias).toBe('key_0');
        currentMs += 125;
        return `ok:${modelName}`;
      }
    );

    expect(response).toEqual({
      result: `ok:${resolveModelName('hint')}`,
      keyAlias: 'key_0',
      modelUsed: resolveModelName('hint'),
      latencyMs: 125,
    });
  });

  it('2. randomized start memilih indeks awal berbeda saat nilai rng berbeda', async () => {
    const healthStore = new InMemoryKeyHealthStore();
    const chosenAliases: string[] = [];

    for (const rngValue of [0.05, 0.45, 0.9]) {
      const pool = createGeminiKeyPool({
        keys: FAKE_KEYS,
        healthStore,
        rng: () => rngValue,
      });

      const res = await pool.executeWithFailover(
        'mentor',
        async (_key, _model, alias) => alias
      );
      chosenAliases.push(res.keyAlias);
    }

    expect(chosenAliases).toEqual(['key_0', 'key_1', 'key_2']);
  });

  it('3. sequential circular failover: kunci 429 masuk cooldown 60 detik dan sukses pada kunci berikutnya', async () => {
    const healthStore = new InMemoryKeyHealthStore();
    const currentMs = 1_700_000_000_000;
    const attempted: string[] = [];

    // Mulai dari indeks terakhir (key_2) untuk membuktikan perputaran melingkar ke key_0
    const pool = createGeminiKeyPool({
      keys: FAKE_KEYS,
      healthStore,
      cooldownMs: 60_000,
      rng: () => 0.9,
      now: () => new Date(currentMs),
    });

    const response = await pool.executeWithFailover(
      'mentor',
      async (_apiKey, _modelName, keyAlias) => {
        attempted.push(keyAlias);
        if (keyAlias === 'key_2') {
          const err = new Error('429 RESOURCE_EXHAUSTED');
          Object.assign(err, { status: 429 });
          throw err;
        }
        return 'berhasil-setelah-failover';
      }
    );

    expect(attempted).toEqual(['key_2', 'key_0']);
    expect(response.result).toBe('berhasil-setelah-failover');
    expect(response.keyAlias).toBe('key_0');

    const cooldownEntry = healthStore.entries.get('key_2');
    expect(cooldownEntry).toEqual({
      cooldownUntilMs: currentMs + 60_000,
      lastErrorCode: 429,
      failureCount: 1,
    });
  });

  it('4. shared circuit breaker langsung melewati kunci yang sedang cooldown (tidak pernah dipanggil)', async () => {
    const healthStore = new InMemoryKeyHealthStore();
    const currentMs = 1_700_000_000_000;

    await healthStore.markCooldown('key_0', 429, 60_000, new Date(currentMs));
    await healthStore.markCooldown('key_1', 503, 60_000, new Date(currentMs));

    const calledAliases: string[] = [];
    const pool = createGeminiKeyPool({
      keys: FAKE_KEYS,
      healthStore,
      rng: () => 0.0,
      now: () => new Date(currentMs + 10_000),
    });

    const response = await pool.executeWithFailover(
      'hint',
      async (_apiKey, _modelName, keyAlias) => {
        calledAliases.push(keyAlias);
        return 'ok';
      }
    );

    expect(calledAliases).toEqual(['key_2']);
    expect(response.keyAlias).toBe('key_2');
  });

  it('5. pemulihan otomatis: setelah clock maju > 60 detik, kunci cooldown dapat dipakai kembali', async () => {
    const healthStore = new InMemoryKeyHealthStore();
    let currentMs = 1_700_000_000_000;

    await healthStore.markCooldown('key_0', 429, 60_000, new Date(currentMs));

    const pool = createGeminiKeyPool({
      keys: [FAKE_KEYS[0]],
      healthStore,
      rng: () => 0.0,
      now: () => new Date(currentMs),
    });

    // Masih di dalam masa cooldown (30 detik berlalu) -> harus AllKeysExhaustedError
    currentMs += 30_000;
    await expect(
      pool.executeWithFailover('hint', async () => 'tidak-akan-jalan')
    ).rejects.toBeInstanceOf(AllKeysExhaustedError);

    // Maju melewati 60 detik (total 61 detik) -> pulih otomatis
    currentMs += 31_000;
    const recovered = await pool.executeWithFailover(
      'hint',
      async (_key, _model, alias) => `pulih:${alias}`
    );

    expect(recovered.result).toBe('pulih:key_0');
    expect(recovered.keyAlias).toBe('key_0');
  });

  it('6. seluruh kunci gagal 429/503 melempar AllKeysExhaustedError', async () => {
    const healthStore = new InMemoryKeyHealthStore();
    const currentMs = 1_700_000_000_000;
    const attempted: string[] = [];

    const pool = createGeminiKeyPool({
      keys: FAKE_KEYS,
      healthStore,
      rng: () => 0.0,
      now: () => new Date(currentMs),
    });

    await expect(
      pool.executeWithFailover('mentor', async (_key, _model, alias) => {
        attempted.push(alias);
        if (alias === 'key_0') {
          throw new Error('RESOURCE_EXHAUSTED: quota exceeded');
        }
        const err = new Error('Service UNAVAILABLE');
        Object.assign(err, { status: 503 });
        throw err;
      })
    ).rejects.toBeInstanceOf(AllKeysExhaustedError);

    expect(attempted).toEqual(['key_0', 'key_1', 'key_2']);
    expect(healthStore.entries.size).toBe(3);
  });

  it('7. error 400 Bad Request langsung dilempar tanpa failover dan tanpa menandai cooldown', async () => {
    const healthStore = new InMemoryKeyHealthStore();
    const taskSpy = vi.fn(async () => {
      const badReq = new Error('400 Bad Request: invalid schema');
      Object.assign(badReq, { status: 400 });
      throw badReq;
    });

    const pool = createGeminiKeyPool({
      keys: FAKE_KEYS,
      healthStore,
      rng: () => 0.0,
    });

    await expect(pool.executeWithFailover('mentor', taskSpy)).rejects.toThrow(
      '400 Bad Request'
    );

    expect(taskSpy).toHaveBeenCalledTimes(1);
    expect(healthStore.entries.size).toBe(0);
  });

  it('8. keamanan rahasia: pesan error dan return value tidak pernah mengandung string mentah API key', async () => {
    const healthStore = new InMemoryKeyHealthStore();
    const pool = createGeminiKeyPool({
      keys: FAKE_KEYS,
      healthStore,
      rng: () => 0.0,
    });

    // Kasus A: Return value pada eksekusi sukses
    const successRes = await pool.executeWithFailover('hint', async () => ({
      hint: 'Cek kembali syarat batas pada percabanganmu.',
    }));
    const serializedReturn = JSON.stringify(successRes);
    for (const rawKey of FAKE_KEYS) {
      expect(serializedReturn).not.toContain(rawKey);
      expect(serializedReturn).not.toContain('AIza');
    }

    // Kasus B: AllKeysExhaustedError saat semua kunci gagal 429 dengan pesan yang memuat key
    let exhaustedMessage = '';
    try {
      await pool.executeWithFailover('hint', async (apiKey) => {
        const err = new Error(`429 quota exceeded for key ${apiKey}`);
        Object.assign(err, { status: 429 });
        throw err;
      });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AllKeysExhaustedError);
      exhaustedMessage = err instanceof Error ? err.message : String(err);
    }

    for (const rawKey of FAKE_KEYS) {
      expect(exhaustedMessage).not.toContain(rawKey);
    }
    expect(exhaustedMessage).not.toContain('AIza');

    // Kasus C: Error 400 non-failover yang tidak sengaja menggemakan API key tetap disanitasi
    const freshStore = new InMemoryKeyHealthStore();
    const freshPool = createGeminiKeyPool({
      keys: FAKE_KEYS,
      healthStore: freshStore,
      rng: () => 0.0,
    });

    let badRequestMessage = '';
    try {
      await freshPool.executeWithFailover('mentor', async (apiKey) => {
        const err = new Error(`Bad request with credential ${apiKey}`);
        Object.assign(err, { status: 400 });
        throw err;
      });
    } catch (err: unknown) {
      badRequestMessage = err instanceof Error ? err.message : String(err);
    }

    expect(badRequestMessage).not.toContain(FAKE_KEYS[0]);
    expect(badRequestMessage).toContain('[REDACTED]');

    // Kasus D: parseApiKeys membuang spasi, duplikat, dan melempar GeminiPoolConfigError jika kosong
    expect(
      parseApiKeys(` ${FAKE_KEYS[0]} , , ${FAKE_KEYS[1]} , ${FAKE_KEYS[0]} `)
    ).toEqual([FAKE_KEYS[0], FAKE_KEYS[1]]);
    expect(() => parseApiKeys('   ,  ')).toThrow(GeminiPoolConfigError);
  });
});
