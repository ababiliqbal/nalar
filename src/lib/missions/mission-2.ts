import type { MissionDefinition } from '@/lib/types/domain';

export const mission2: MissionDefinition = {
  id: 2,
  slug: 'aturan-kelulusan-presensi',
  title: 'Aturan Kelulusan & Presensi',
  subtitle: 'Mengambil keputusan berlapis menggunakan percabangan bertingkat (nested if)',
  kkaTopic: 'Percabangan Bertingkat (Nested If) & Operator Logika (AP-K10-07)',
  caseNarrative: [
    'Sekolah menerapkan aturan kelulusan akhir semester mata pelajaran KKA berdasarkan tiga data siswa: nilai ujian (0–100), persentase kehadiran (0–100), dan kepemilikan surat izin resmi (ada_surat_izin bernilai True atau False).',
    'Aturan keputusan berlapis yang berlaku adalah:',
    '• Jika nilai >= 75:',
    '  - Jika kehadiran >= 80 -> "Lulus"',
    '  - Selain jika kehadiran >= 60 dan ada_surat_izin bernilai True -> "Lulus Bersyarat"',
    '  - Selain itu -> "Tidak Lulus (Kehadiran Kurang)"',
    '• Selain itu (nilai < 75):',
    '  - Jika kehadiran >= 80 -> "Remedial"',
    '  - Selain itu -> "Tidak Lulus"',
  ].join('\n\n'),
  stages: {
    logic: {
      prompt:
        'Tentukan status kelulusan untuk dua siswa berikut beserta alasan langkah demi langkah: (1) Rani dengan nilai 82, kehadiran 68%, dan memiliki surat izin resmi; (2) Bima dengan nilai 70, kehadiran 90%, tanpa surat izin.',
      rubricCriteria: [
        'Menggunakan pengecekan nilai >= 75 sebagai pemisah kelompok keputusan utama sebelum mengecek kehadiran.',
        'Menyimpulkan status Rani adalah "Lulus Bersyarat" karena nilai >= 75, kehadiran >= 60%, dan memiliki surat izin resmi.',
        'Menyimpulkan status Bima adalah "Remedial" karena nilai < 75 tetapi kehadirannya >= 80%.',
        'Membedakan syarat antara "Tidak Lulus (Kehadiran Kurang)" dengan "Tidak Lulus" secara tepat.',
      ],
      staticHints: {
        EXPLORER:
          'Untuk setiap siswa, lihat dulu apakah nilainya sudah mencapai minimal 75 atau belum, baru setelah itu periksa aturan kehadirannya.',
        BUILDER:
          'Cocokkan data Rani dan Bima dengan dua kelompok aturan utama, lalu cek syarat gabungan kehadiran dan surat izin untuk Rani.',
        ARCHITECT:
          'Pastikan alasanmu memperlihatkan ketergantungan bertingkat antara syarat nilai dan syarat presensi untuk kedua siswa.',
      },
    },
    analysis: {
      prompt:
        'Tuliskan pseudocode percabangan bertingkat (nested if) dengan INPUT nilai, kehadiran, ada_surat_izin. Pisahkan blok utama nilai >= 75 dan ELSE, lalu tuliskan sub-percabangan kehadiran dan operator logika AND di dalam masing-masing blok.',
      rubricCriteria: [
        'Menyusun percabangan luar yang membagi kasus nilai >= 75 dan ELSE (nilai < 75).',
        'Di dalam blok nilai >= 75, menuliskan tiga sub-cabang lengkap: kehadiran >= 80 ("Lulus"), kehadiran >= 60 AND ada_surat_izin ("Lulus Bersyarat"), dan ELSE ("Tidak Lulus (Kehadiran Kurang)").',
        'Di dalam blok ELSE (nilai < 75), menuliskan dua sub-cabang lengkap: kehadiran >= 80 ("Remedial") dan ELSE ("Tidak Lulus").',
        'Menjaga indentasi atau penanda blok yang rapi sehingga struktur nested if jelas terbaca.',
      ],
      staticHints: {
        EXPLORER:
          'Buat satu blok IF besar untuk nilai >= 75 dan satu blok ELSE di bawahnya, lalu masukkan pemeriksaan kehadiran dengan menjorok ke dalam.',
        BUILDER:
          'Pada sub-cabang "Lulus Bersyarat", gabungkan dua syarat sekaligus menggunakan operator logika AND.',
        ARCHITECT:
          'Periksa kembali apakah seluruh lima kemungkinan status sudah terpetakan ke cabang yang tepat tanpa ada kondisi yang saling tumpang tindih.',
      },
    },
    evaluation: {
      edgeCaseScenario:
        'Uji pseudocode-mu pada tiga kasus batas berikut: (a) nilai = 75, kehadiran = 80, ada_surat_izin = False; (b) nilai = 85, kehadiran = 59, ada_surat_izin = True; (c) nilai = 74, kehadiran = 100, ada_surat_izin = True.',
      prompt:
        'Telusuri hasil ketiga kasus batas di atas berdasarkan pseudocode-mu! Jelaskan status akhir masing-masing serta mengapa pemilihan operator >= dibanding > sangat krusial pada nilai batas 75, 80, dan 60.',
      rubricCriteria: [
        'Menentukan hasil kasus (a) = "Lulus" dan menjelaskan bahwa batas 75 dan 80 termasuk syarat lulus karena memakai operator >=.',
        'Menentukan hasil kasus (b) = "Tidak Lulus (Kehadiran Kurang)" karena kehadiran 59 berada di bawah batas 60 meskipun memiliki surat izin.',
        'Menentukan hasil kasus (c) = "Remedial" karena nilai 74 < 75 sehingga masuk blok bawah, lalu kehadiran 100 >= 80.',
        'Menjelaskan kesalahan yang terjadi bila operator >= keliru ditulis menjadi > pada nilai batas.',
      ],
      staticHints: {
        EXPLORER:
          'Uji satu per satu kasus (a), (b), dan (c) mulai dari syarat nilai di paling luar. Hati-hati dengan angka batas seperti 75 dan 59!',
        BUILDER:
          'Pada kasus (b), cek apakah memiliki surat izin saja cukup ketika kehadiran baru 59%. Pada kasus (c), cek blok luar mana yang dimasuki nilai 74.',
        ARCHITECT:
          'Analisis sensitivitas batas (*boundary analysis*): jelaskan secara presisi angka mana saja yang akan berubah status jika tanda >= diganti >.',
      },
    },
    coding: {
      prompt:
        'Implementasikan fungsi Python cek_kelulusan(nilai, kehadiran, ada_surat_izin) menggunakan struktur nested if dan kembalikan string status persis sesuai aturan kasus.',
      starterCode: [
        'def cek_kelulusan(nilai, kehadiran, ada_surat_izin):',
        '    # Implementasikan percabangan bertingkat (nested if) di bawah ini',
        '    # Nilai kembalian valid:',
        '    # "Lulus", "Lulus Bersyarat", "Tidak Lulus (Kehadiran Kurang)",',
        '    # "Remedial", atau "Tidak Lulus"',
        '    pass',
      ].join('\n'),
      testCases: [
        {
          id: 'm2-t1',
          label: 'Siswa lulus penuh (nilai 88, kehadiran 92)',
          isEdgeCase: false,
          harnessCode:
            'assert cek_kelulusan(88, 92, False) == "Lulus", "Nilai 88 dan kehadiran 92 seharusnya menghasilkan Lulus"',
          expectedOutput: 'Lulus',
        },
        {
          id: 'm2-t2',
          label: 'Siswa lulus bersyarat dengan surat izin (nilai 82, kehadiran 68)',
          isEdgeCase: false,
          harnessCode:
            'assert cek_kelulusan(82, 68, True) == "Lulus Bersyarat", "Nilai 82, kehadiran 68, dan ada surat izin seharusnya menghasilkan Lulus Bersyarat"',
          expectedOutput: 'Lulus Bersyarat',
        },
        {
          id: 'm2-t3',
          label: 'Nilai cukup tetapi kehadiran 70 tanpa surat izin',
          isEdgeCase: false,
          harnessCode:
            'assert cek_kelulusan(80, 70, False) == "Tidak Lulus (Kehadiran Kurang)", "Nilai 80 dengan kehadiran 70 tanpa surat izin seharusnya menghasilkan Tidak Lulus (Kehadiran Kurang)"',
          expectedOutput: 'Tidak Lulus (Kehadiran Kurang)',
        },
        {
          id: 'm2-t4',
          label: 'Nilai kurang tetapi kehadiran tinggi (Remedial)',
          isEdgeCase: false,
          harnessCode:
            'assert cek_kelulusan(70, 90, False) == "Remedial", "Nilai 70 dengan kehadiran 90 seharusnya menghasilkan Remedial"',
          expectedOutput: 'Remedial',
        },
        {
          id: 'm2-t5',
          label: 'Nilai kurang dan kehadiran rendah (Tidak Lulus)',
          isEdgeCase: false,
          harnessCode:
            'assert cek_kelulusan(60, 50, True) == "Tidak Lulus", "Nilai 60 dan kehadiran 50 seharusnya menghasilkan Tidak Lulus meski ada surat izin"',
          expectedOutput: 'Tidak Lulus',
        },
        {
          id: 'm2-t6',
          label: 'Nilai batas tepat 75 dan kehadiran tepat 80',
          isEdgeCase: true,
          harnessCode:
            'assert cek_kelulusan(75, 80, False) == "Lulus", "Batas tepat nilai 75 dan kehadiran 80 seharusnya menghasilkan Lulus (periksa operator >=)"',
          expectedOutput: 'Lulus',
        },
        {
          id: 'm2-t7',
          label: 'Kasus ekstrem kehadiran 59 walau punya surat izin',
          isEdgeCase: true,
          harnessCode:
            'assert cek_kelulusan(85, 59, True) == "Tidak Lulus (Kehadiran Kurang)", "Kehadiran 59 berada di bawah 60 sehingga seharusnya Tidak Lulus (Kehadiran Kurang) walau punya surat izin"',
          expectedOutput: 'Tidak Lulus (Kehadiran Kurang)',
        },
        {
          id: 'm2-t8',
          label: 'Kasus ekstrem nilai 74 walau kehadiran 100 dan punya surat izin',
          isEdgeCase: true,
          harnessCode:
            'assert cek_kelulusan(74, 100, True) == "Remedial", "Nilai 74 kurang dari 75 tetapi kehadiran 100 seharusnya menghasilkan Remedial"',
          expectedOutput: 'Remedial',
        },
      ],
      staticHints: {
        EXPLORER:
          'Perhatikan indentasi 4 spasi di Python: setiap if di dalam blok if/else utama harus menjorok lebih dalam satu tingkat lagi.',
        BUILDER:
          'Cek kembali penggunaan operator >= pada batas 75, 80, dan 60, serta pastikan ejaan tanda kurung pada "Tidak Lulus (Kehadiran Kurang)" persis sama.',
        ARCHITECT:
          'Pastikan blok nilai >= 75 dan blok else benar-benar terisolasi sehingga keberadaan surat izin tidak memengaruhi siswa bernilai di bawah 75.',
      },
    },
  },
  reflectionQuestion:
    'Bagian mana dari aturan percabangan bertingkat (seperti operator batas >= atau pemisahan blok nested if) yang paling berisiko menimbulkan kesalahan logika dan bagaimana kamu memastikannya benar?',
};
