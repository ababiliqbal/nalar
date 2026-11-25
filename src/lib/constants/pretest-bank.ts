import 'server-only';

import { mapScoreToLevel } from '@/lib/constants/levels';
import type {
  PretestGradeResult,
  PretestQuestionInternal,
  PretestQuestionPublic,
} from '@/lib/types/domain';

export const PRETEST_TOTAL_QUESTIONS = 6 as const;

/**
 * Bank soal pretest kanonik (server-only).
 * Distribusi kunci seimbang: 1=A, 2=D, 3=B, 4=C, 5=D, 6=A.
 */
const PRETEST_BANK: readonly PretestQuestionInternal[] = [
  {
    id: '1',
    number: 1,
    category: 'Urutan Langkah',
    question:
      'Sebuah robot berada di petak (1, 1) pada papan grid berukuran 4 × 4 (kolom 1–4 dari kiri ke kanan, baris 1–4 dari bawah ke atas) dan menghadap ke UTARA (atas). Robot menjalankan perintah berikut secara berurutan. Di koordinat (kolom, baris) manakah posisi akhir robot, dan ke arah mana ia menghadap?',
    codeSnippet: [
      '1. MAJU 2 petak',
      '2. BELOK KANAN 90°',
      '3. MAJU 1 petak',
      '4. BELOK KIRI 90°',
      '5. MAJU 1 petak',
    ].join('\n'),
    options: [
      { key: 'A', label: '(2, 4) menghadap UTARA' },
      { key: 'B', label: '(3, 3) menghadap TIMUR' },
      { key: 'C', label: '(2, 3) menghadap TIMUR' },
      { key: 'D', label: '(4, 2) menghadap UTARA' },
    ],
    answer: 'A',
  },
  {
    id: '2',
    number: 2,
    category: 'Urutan Langkah',
    question:
      'Terdapat tiga gelas: Gelas A berisi jus jeruk, Gelas B berisi sirup melon, dan Gelas C kosong sebagai gelas cadangan. Kamu ingin menukar isi Gelas A dan Gelas B tanpa mencampurkan kedua cairan. Manakah urutan langkah yang paling tepat?',
    options: [
      {
        key: 'A',
        label: 'Tuang isi A ke B → Tuang isi B ke C → Tuang isi C ke A',
      },
      {
        key: 'B',
        label: 'Tuang isi A ke C → Tuang isi C ke B → Tuang isi B ke A',
      },
      {
        key: 'C',
        label: 'Tuang isi B ke A → Tuang isi A ke C → Tuang isi C ke B',
      },
      {
        key: 'D',
        label: 'Tuang isi A ke C → Tuang isi B ke A → Tuang isi C ke B',
      },
    ],
    answer: 'D',
  },
  {
    id: '3',
    number: 3,
    category: 'Percabangan IF-ELSE',
    question:
      'Sistem tiket masuk Gedung Olahraga menerapkan aturan tarif seperti pada pseudocode di bawah ini. Jika Raka berusia 16 tahun dan tidak membawa kartu pelajar (punya_kartu_pelajar = SALAH), berapakah tarif yang ditampilkan sistem?',
    codeSnippet: [
      'INPUT usia, punya_kartu_pelajar',
      '',
      'JIKA usia < 12 MAKA',
      '    tarif = 10000',
      'SELAIN JIKA usia <= 18 DAN punya_kartu_pelajar == BENAR MAKA',
      '    tarif = 15000',
      'SELAIN JIKA usia <= 18 MAKA',
      '    tarif = 20000',
      'SELAIN ITU',
      '    tarif = 30000',
      'AKHIR JIKA',
      '',
      'OUTPUT tarif',
    ].join('\n'),
    options: [
      { key: 'A', label: 'Rp15.000' },
      { key: 'B', label: 'Rp20.000' },
      { key: 'C', label: 'Rp30.000' },
      { key: 'D', label: 'Rp10.000' },
    ],
    answer: 'B',
  },
  {
    id: '4',
    number: 4,
    category: 'Percabangan IF-ELSE',
    question:
      'Sebuah sekolah menentukan status kelulusan ujian praktikum menggunakan pseudocode berikut. Jika Dina memperoleh nilai_ujian = 78, kehadiran = 70, dan ada_surat_sakit = BENAR, apakah status yang dihasilkan untuk Dina?',
    codeSnippet: [
      'INPUT nilai_ujian, kehadiran, ada_surat_sakit',
      '',
      'JIKA nilai_ujian >= 75 DAN (kehadiran >= 80 ATAU ada_surat_sakit == BENAR) MAKA',
      '    status = "LULUS"',
      'SELAIN JIKA nilai_ujian >= 60 DAN kehadiran >= 80 MAKA',
      '    status = "REMEDIAL"',
      'SELAIN ITU',
      '    status = "TIDAK LULUS"',
      'AKHIR JIKA',
      '',
      'OUTPUT status',
    ].join('\n'),
    options: [
      { key: 'A', label: '"TIDAK LULUS"' },
      { key: 'B', label: '"REMEDIAL"' },
      { key: 'C', label: '"LULUS"' },
      { key: 'D', label: '"LULUS" dan "REMEDIAL" ditampilkan bersamaan' },
    ],
    answer: 'C',
  },
  {
    id: '5',
    number: 5,
    category: 'Penelusuran Variabel',
    question:
      'Perhatikan urutan perubahan nilai variabel poin dan bonus pada pseudocode di bawah ini. Berapakah nilai akhir variabel poin yang ditampilkan pada baris terakhir?',
    codeSnippet: [
      'poin = 10',
      'bonus = 4',
      'poin = poin + bonus',
      'bonus = bonus * 2',
      'poin = poin - 3',
      'poin = poin + bonus',
      'OUTPUT poin',
    ].join('\n'),
    options: [
      { key: 'A', label: '15' },
      { key: 'B', label: '18' },
      { key: 'C', label: '22' },
      { key: 'D', label: '19' },
    ],
    answer: 'D',
  },
  {
    id: '6',
    number: 6,
    category: 'Penelusuran Variabel',
    question:
      'Perhatikan simulasi perubahan saldo dengan perulangan sebanyak 3 kali pada pseudocode berikut. Berapakah nilai akhir variabel saldo setelah perulangan selesai dijalankan?',
    codeSnippet: [
      'saldo = 20000',
      '',
      'ULANGI SEBANYAK 3 KALI:',
      '    JIKA saldo < 30000 MAKA',
      '        saldo = saldo + 10000',
      '    SELAIN ITU',
      '        saldo = saldo - 5000',
      '    AKHIR JIKA',
      'AKHIR ULANGI',
      '',
      'OUTPUT saldo',
    ].join('\n'),
    options: [
      { key: 'A', label: '35000' },
      { key: 'B', label: '25000' },
      { key: 'C', label: '30000' },
      { key: 'D', label: '50000' },
    ],
    answer: 'A',
  },
];

/**
 * Mengembalikan daftar soal pretest tanpa field `answer` agar aman dikirim ke klien.
 */
export function getPublicPretestQuestions(): PretestQuestionPublic[] {
  return PRETEST_BANK.map((question) => ({
    id: question.id,
    number: question.number,
    category: question.category,
    question: question.question,
    ...(question.codeSnippet !== undefined
      ? { codeSnippet: question.codeSnippet }
      : {}),
    options: question.options.map((option) => ({ ...option })),
  }));
}

/**
 * Menilai jawaban pretest di sisi server secara deterministik dan memetakan level scaffolding awal.
 */
export function gradePretestAnswers(
  answers: Record<string, string>
): PretestGradeResult {
  let score = 0;

  for (const question of PRETEST_BANK) {
    const submitted = answers[question.id]?.trim().toUpperCase();
    if (submitted === question.answer) {
      score += 1;
    }
  }

  return {
    score,
    total: PRETEST_TOTAL_QUESTIONS,
    level: mapScoreToLevel(score),
  };
}
