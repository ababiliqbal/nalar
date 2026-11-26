import { z } from 'zod';

export const NISN_REGEX = /^\d{10}$/;
export const DDMM_PIN_REGEX = /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])$/;

export const authSessionSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(120, 'Nama lengkap maksimal 120 karakter'),
  nisn: z
    .string()
    .trim()
    .regex(NISN_REGEX, 'NISN harus terdiri dari tepat 10 digit angka'),
  kelas: z
    .string()
    .trim()
    .min(1, 'Kelas wajib diisi')
    .max(40, 'Kelas maksimal 40 karakter'),
  sekolah: z
    .string()
    .trim()
    .min(2, 'Asal sekolah minimal 2 karakter')
    .max(150, 'Asal sekolah maksimal 150 karakter'),
  pin: z
    .string()
    .trim()
    .regex(
      DDMM_PIN_REGEX,
      'PIN harus 4 digit tanggal & bulan lahir yang valid (format DDMM, contoh: 1708)'
    ),
  consent: z.literal(true, {
    error: 'Persetujuan penggunaan data penelitian wajib dicentang',
  }),
});

export type AuthSessionInput = z.infer<typeof authSessionSchema>;
