import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import {
  SESSION_MAX_AGE_SECONDS,
  computeIdentityKeyHash,
  hashPin,
  signSessionToken,
  verifyPin,
  verifySessionToken,
} from '@/lib/services/auth.service';
import { authSessionSchema } from '@/lib/validation/schemas';

const TEST_SESSION_SECRET =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('auth.service.ts — Keamanan Identitas, PIN scrypt, & JWT Sesi', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SESSION_SECRET;
  });

  describe('computeIdentityKeyHash', () => {
    it('bersifat case-insensitive dan menormalisasi spasi berlebih pada nama sekolah', () => {
      const hashA = computeIdentityKeyHash('0091234567', 'SMAN 1 Yogyakarta');
      const hashB = computeIdentityKeyHash(
        ' 0091234567 ',
        '  sman   1   yogyakarta  '
      );

      expect(hashA).toBe(hashB);
      expect(hashA).toMatch(/^[0-9a-f]{64}$/);
    });

    it('menghasilkan hash berbeda untuk NISN atau sekolah berbeda', () => {
      const hashA = computeIdentityKeyHash('0091234567', 'SMAN 1 Yogyakarta');
      const hashDifferentNisn = computeIdentityKeyHash(
        '0091234568',
        'SMAN 1 Yogyakarta'
      );
      const hashDifferentSchool = computeIdentityKeyHash(
        '0091234567',
        'SMAN 2 Yogyakarta'
      );

      expect(hashA).not.toBe(hashDifferentNisn);
      expect(hashA).not.toBe(hashDifferentSchool);
    });
  });

  describe('hashPin & verifyPin', () => {
    it('menghasilkan hash bergaram acak (bukan plaintext) dan memverifikasi PIN cocok', () => {
      const hash1 = hashPin('1708');
      const hash2 = hashPin('1708');

      expect(hash1).not.toBe('1708');
      expect(hash1).not.toContain('1708');
      expect(hash1).not.toBe(hash2);
      expect(hash1.split(':')).toHaveLength(2);

      expect(verifyPin('1708', hash1)).toBe(true);
      expect(verifyPin('1708', hash2)).toBe(true);
    });

    it('menolak PIN yang salah dan aman terhadap panjang hash berbeda atau format rusak', () => {
      const stored = hashPin('1708');
      const [salt] = stored.split(':');

      expect(verifyPin('1808', stored)).toBe(false);
      expect(verifyPin('0000', stored)).toBe(false);
      expect(verifyPin('1708', `${salt}:abcd`)).toBe(false);
      expect(verifyPin('1708', `${salt}:not-valid-hex!`)).toBe(false);
      expect(verifyPin('1708', 'format-tanpa-titik-dua')).toBe(false);
      expect(verifyPin('1708', '')).toBe(false);
    });
  });

  describe('signSessionToken & verifySessionToken', () => {
    it('menandatangani dan memverifikasi payload sesi HS256 dengan masa berlaku 7 hari', async () => {
      const token = await signSessionToken({
        studentId: '11111111-2222-4333-8444-555555555555',
        currentLevel: 'BUILDER',
        pretestCompleted: true,
      });

      const verified = await verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.studentId).toBe('11111111-2222-4333-8444-555555555555');
      expect(verified?.currentLevel).toBe('BUILDER');
      expect(verified?.pretestCompleted).toBe(true);
      expect((verified?.exp ?? 0) - (verified?.iat ?? 0)).toBe(
        SESSION_MAX_AGE_SECONDS
      );
    });

    it('mengembalikan null untuk token yang dimanipulasi, tidak valid, atau berbeda secret', async () => {
      const token = await signSessionToken({
        studentId: '11111111-2222-4333-8444-555555555555',
        currentLevel: 'EXPLORER',
        pretestCompleted: false,
      });

      const tampered = `${token.slice(0, -4)}ffff`;
      expect(await verifySessionToken(tampered)).toBeNull();
      expect(await verifySessionToken('bukan-jwt')).toBeNull();
      expect(await verifySessionToken('')).toBeNull();

      process.env.SESSION_SECRET =
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      expect(await verifySessionToken(token)).toBeNull();
    });
  });

  describe('authSessionSchema — Validasi Format PIN DDMM & Identitas', () => {
    const basePayload = {
      nama: 'Raka Pratama',
      nisn: '0091234567',
      kelas: 'X-2',
      sekolah: 'SMAN 1 Yogyakarta',
      pin: '1708',
      consent: true as const,
    };

    it('menerima PIN DDMM valid seperti 1708, 0101, dan 3112', () => {
      expect(authSessionSchema.safeParse(basePayload).success).toBe(true);
      expect(
        authSessionSchema.safeParse({ ...basePayload, pin: '0101' }).success
      ).toBe(true);
      expect(
        authSessionSchema.safeParse({ ...basePayload, pin: '3112' }).success
      ).toBe(true);
    });

    it('menolak PIN DDMM tidak valid seperti 3213, 123, 0008, dan 1513', () => {
      for (const invalidPin of ['3213', '123', '0008', '1513', '1700', 'abcd']) {
        expect(
          authSessionSchema.safeParse({ ...basePayload, pin: invalidPin })
            .success
        ).toBe(false);
      }
    });

    it('menolak NISN bukan 10 digit atau consent false', () => {
      expect(
        authSessionSchema.safeParse({ ...basePayload, nisn: '12345' }).success
      ).toBe(false);
      expect(
        authSessionSchema.safeParse({ ...basePayload, consent: false }).success
      ).toBe(false);
    });
  });
});
