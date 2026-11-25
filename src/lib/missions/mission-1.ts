import type { MissionDefinition } from '@/lib/types/domain';

export const mission1: MissionDefinition = {
  id: 1,
  slug: 'rute-terbaik-sekolah',
  title: 'Mencari Rute Terbaik ke Sekolah',
  subtitle: 'Menentukan rute paling aman dengan percabangan dasar if-elif-else',
  kkaTopic: 'Logika & Percabangan Dasar (if-elif-else)',
  caseNarrative: [
    'Mamat berangkat dari rumah pukul 06.35 WIB dan harus tiba di sekolah paling lambat pukul 07.00 WIB (batas waktu maksimal 25 menit).',
    'Ada tiga pilihan jalur menuju sekolah dengan kondisi masing-masing:',
    '1. Jalur A (Jalan Raya): butuh 15 menit saat cuaca cerah, tetapi macet hingga 45 menit jika hujan.',
    '2. Jalur B (Jalan Tikus): butuh 25 menit (tepat batas waktu), tetapi tertutup dan tidak bisa dilalui jika banjir.',
    '3. Jalur C (Jalan Tol): butuh 10 menit (tercepat), tetapi hanya bisa dilalui jika membawa uang tol (punya_uang).',
    'Aturan prioritas keputusan yang ditetapkan: cek Jalur A terlebih dahulu (jika tidak hujan -> "Jalur A"); jika tidak memenuhi, cek Jalur B (jika tidak banjir -> "Jalur B"); jika masih tidak memenuhi, cek Jalur C (jika punya uang -> "Jalur C"); jika seluruh jalur tidak memungkinkan, nyatakan "Tidak Ada Jalur Aman".',
  ].join('\n\n'),
  stages: {
    logic: {
      prompt:
        'Pagi ini cuaca sedang hujan deras, Jalan Tikus tidak banjir, dan Mamat tidak membawa uang tol. Dengan bahasa sehari-hari yang runtut, jelaskan jalur mana yang sebaiknya dipilih Mamat beserta alasan mengapa dua jalur lainnya tidak dipilih!',
      rubricCriteria: [
        'Menyebutkan batas waktu maksimal perjalanan Mamat adalah 25 menit (dari 06.35 hingga 07.00).',
        'Menjelaskan bahwa Jalur A (Jalan Raya) tidak dapat dipilih saat hujan karena waktu tempuhnya 45 menit (melebihi batas 25 menit).',
        'Menjelaskan bahwa Jalur C (Jalan Tol) tidak dapat dipilih karena Mamat tidak membawa uang tol.',
        'Menyimpulkan pilihan yang tepat adalah Jalur B (Jalan Tikus) selama kondisi jalan tersebut tidak sedang banjir.',
      ],
      staticHints: {
        EXPLORER:
          'Coba hitung dulu berapa menit sisa waktu Mamat dari pukul 06.35 sampai 07.00, lalu bandingkan dengan waktu tempuh setiap jalur saat hujan.',
        BUILDER:
          'Periksa satu per satu syarat Jalur A, Jalur B, dan Jalur C terhadap kondisi pagi ini serta batas waktu 25 menit.',
        ARCHITECT:
          'Pastikan penalaranmu tidak hanya menyebut jalur terpilih, tetapi juga membuktikan secara eksplisit mengapa dua jalur lainnya gugur.',
      },
    },
    analysis: {
      prompt:
        'Susun pseudocode terstruktur (gunakan INPUT, IF, ELIF, ELSE, dan OUTPUT) untuk menentukan rute berdasarkan tiga kondisi boolean: hujan, banjir, dan punya_uang sesuai urutan prioritas Jalur A -> Jalur B -> Jalur C -> Tidak Ada Jalur Aman.',
      rubricCriteria: [
        'Menuliskan deklarasi input untuk ketiga kondisi boolean: hujan, banjir, dan punya_uang.',
        'Menyusun percabangan berurutan (IF / ELIF) dengan prioritas tepat: tidak hujan -> "Jalur A", tidak banjir -> "Jalur B", dan punya_uang -> "Jalur C".',
        'Menyertakan cabang penutup ELSE yang menghasilkan "Tidak Ada Jalur Aman".',
        'Menuliskan struktur blok dan perintah OUTPUT secara jelas dan mudah ditelusuri langkah demi langkah.',
      ],
      staticHints: {
        EXPLORER:
          'Mulai dari baris INPUT untuk menampung tiga kondisi cuaca dan uang, lalu periksa syarat jalur pertama menggunakan kata kunci IF.',
        BUILDER:
          'Gunakan ELIF agar pemeriksaan Jalur B dan Jalur C hanya dijalankan jika jalur dengan prioritas lebih tinggi tidak memenuhi syarat.',
        ARCHITECT:
          'Pastikan urutan kondisimu menjaga prioritas deterministik dan sudah menutup semua kemungkinan kombinasi input melalui cabang ELSE.',
      },
    },
    evaluation: {
      edgeCaseScenario:
        'Pagi ini terjadi cuaca ekstrem: hujan turun sangat deras (hujan = True), Jalan Tikus tergenang banjir (banjir = True), dan Mamat lupa membawa uang tol (punya_uang = False).',
      prompt:
        'Telusuri pseudocode yang kamu buat terhadap skenario kasus ekstrem di atas! Cabang mana yang akhirnya dijalankan, apa keluarannya, dan apa dampaknya jika cabang ELSE lupa ditulis dalam algoritma?',
      rubricCriteria: [
        'Menelusuri kondisi Jalur A, Jalur B, dan Jalur C satu per satu serta membuktikan ketiganya bernilai salah pada skenario ekstrem.',
        'Menyimpulkan keluaran akhir yang benar adalah "Tidak Ada Jalur Aman" dari cabang ELSE.',
        'Menjelaskan risiko yang muncul jika cabang ELSE tidak ada (misalnya program tidak menghasilkan keluaran atau gagal memberi peringatan).',
      ],
      staticHints: {
        EXPLORER:
          'Coba jalankan pseudocode-mu baris demi baris dengan memasukkan hujan = Benar, banjir = Benar, dan punya_uang = Salah. Cabang mana yang akhirnya terpilih?',
        BUILDER:
          'Periksa apakah ketiga syarat IF/ELIF pertama semuanya gagal pada kasus ini, lalu jelaskan peran cabang terakhir untuk menanganinya.',
        ARCHITECT:
          'Evaluasi ketahanan alur keputusanmu: apa yang terjadi pada sistem nyata jika seluruh kondisi positif bernilai salah tanpa jalur fallback?',
      },
    },
    coding: {
      prompt:
        'Terjemahkan algoritma yang sudah kamu uji ke dalam fungsi Python pilih_rute(hujan, banjir, punya_uang). Kembalikan string yang persis sesuai salah satu dari 4 keluaran: "Jalur A", "Jalur B", "Jalur C", atau "Tidak Ada Jalur Aman".',
      starterCode: [
        'def pilih_rute(hujan, banjir, punya_uang):',
        '    # Tulis logika percabangan if-elif-else di bawah ini',
        '    # Kembalikan salah satu string persis:',
        '    # "Jalur A", "Jalur B", "Jalur C", atau "Tidak Ada Jalur Aman"',
        '    pass',
      ].join('\n'),
      testCases: [
        {
          id: 'm1-t1',
          label: 'Kasus normal Mamat (hujan, tidak banjir, tanpa uang tol)',
          isEdgeCase: false,
          harnessCode:
            'assert pilih_rute(True, False, False) == "Jalur B", "Saat hujan tanpa banjir dan tanpa uang tol, seharusnya memilih Jalur B"',
          expectedOutput: 'Jalur B',
        },
        {
          id: 'm1-t2',
          label: 'Cuaca cerah (tidak hujan, tidak banjir, tanpa uang tol)',
          isEdgeCase: false,
          harnessCode:
            'assert pilih_rute(False, False, False) == "Jalur A", "Saat cuaca cerah (tidak hujan), seharusnya langsung memilih Jalur A"',
          expectedOutput: 'Jalur A',
        },
        {
          id: 'm1-t3',
          label: 'Prioritas Jalur A saat cerah meski banjir dan punya uang tol',
          isEdgeCase: false,
          harnessCode:
            'assert pilih_rute(False, True, True) == "Jalur A", "Saat tidak hujan, Jalur A tetap diprioritaskan meskipun banjir dan punya uang tol"',
          expectedOutput: 'Jalur A',
        },
        {
          id: 'm1-t4',
          label: 'Hujan dan banjir tetapi membawa uang tol',
          isEdgeCase: false,
          harnessCode:
            'assert pilih_rute(True, True, True) == "Jalur C", "Saat hujan dan banjir tetapi membawa uang tol, seharusnya memilih Jalur C"',
          expectedOutput: 'Jalur C',
        },
        {
          id: 'm1-t5',
          label: 'Prioritas Jalur B sebelum Jalur C saat hujan tanpa banjir',
          isEdgeCase: true,
          harnessCode:
            'assert pilih_rute(True, False, True) == "Jalur B", "Saat hujan tetapi tidak banjir, Jalur B harus dipilih sebelum Jalur C meski punya uang tol"',
          expectedOutput: 'Jalur B',
        },
        {
          id: 'm1-t6',
          label: 'Kasus ekstrem semua jalur gagal bersamaan',
          isEdgeCase: true,
          harnessCode:
            'assert pilih_rute(True, True, False) == "Tidak Ada Jalur Aman", "Saat hujan, banjir, dan tidak punya uang tol bersamaan, seharusnya mengembalikan Tidak Ada Jalur Aman"',
          expectedOutput: 'Tidak Ada Jalur Aman',
        },
      ],
      staticHints: {
        EXPLORER:
          'Di Python, negasi kondisi ditulis dengan kata kunci not, setiap baris if/elif/else diakhiri titik dua (:), dan hasil dikembalikan memakai return.',
        BUILDER:
          'Periksa kembali urutan if-elif-else serta ejaan huruf kapital pada string kembalian agar sesuai persis dengan spesifikasi.',
        ARCHITECT:
          'Cek apakah seluruh kombinasi nilai boolean sudah tercakup dengan urutan prioritas yang tepat dan tanpa jalur yang mengembalikan None.',
      },
    },
  },
  reflectionQuestion:
    'Mengapa urutan pengecekan pada if-elif-else dan keberadaan cabang else sangat menentukan kebenaran keputusan saat terjadi kondisi ekstrem pada misi ini?',
};
