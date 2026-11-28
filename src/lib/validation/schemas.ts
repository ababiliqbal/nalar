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

export const pretestOptionKeySchema = z.enum(['A', 'B', 'C', 'D'], {
  error: 'Pilihan jawaban harus berupa A, B, C, atau D',
});

export const pretestAnswersSchema = z
  .object({
    '1': pretestOptionKeySchema,
    '2': pretestOptionKeySchema,
    '3': pretestOptionKeySchema,
    '4': pretestOptionKeySchema,
    '5': pretestOptionKeySchema,
    '6': pretestOptionKeySchema,
  })
  .strict();

export const pretestSubmitSchema = z.object({
  answers: pretestAnswersSchema,
  durationSec: z
    .number({ error: 'Durasi pengerjaan harus berupa angka' })
    .int('Durasi pengerjaan harus bilangan bulat')
    .min(0, 'Durasi pengerjaan tidak boleh negatif')
    .max(86400, 'Durasi pengerjaan melebihi batas wajar'),
});

export type PretestAnswersInput = z.infer<typeof pretestAnswersSchema>;
export type PretestSubmitInput = z.infer<typeof pretestSubmitSchema>;

export const missionIdSchema = z
  .number({ error: 'ID misi harus berupa angka' })
  .int('ID misi harus bilangan bulat')
  .min(1, 'ID misi minimal 1')
  .max(5, 'ID misi maksimal 5');

export const missionStageSchema = z.enum(
  ['logic', 'analysis', 'evaluation', 'coding'],
  { error: 'Tahap misi tidak valid' }
);

export const aiHintRequestSchema = z.object({
  missionId: missionIdSchema,
  stage: missionStageSchema,
  currentInputText: z
    .string()
    .trim()
    .min(20, 'Tulis minimal 20 karakter untuk memicu petunjuk otomatis')
    .max(4000, 'Teks melebihi batas maksimal 4000 karakter'),
});

export const aiChatRequestSchema = z.object({
  missionId: missionIdSchema,
  stage: missionStageSchema,
  message: z
    .string()
    .trim()
    .min(1, 'Pesan tidak boleh kosong')
    .max(2000, 'Pesan maksimal 2000 karakter'),
  currentDraft: z
    .string()
    .max(4000, 'Draf maksimal 4000 karakter')
    .optional(),
});

export const evaluateStageRequestSchema = z.object({
  answerText: z
    .string()
    .trim()
    .min(5, 'Jawaban minimal 5 karakter sebelum dievaluasi')
    .max(4000, 'Jawaban maksimal 4000 karakter'),
});

export type AiHintRequestInput = z.infer<typeof aiHintRequestSchema>;
export type AiChatRequestInput = z.infer<typeof aiChatRequestSchema>;
export type EvaluateStageRequestInput = z.infer<
  typeof evaluateStageRequestSchema
>;

