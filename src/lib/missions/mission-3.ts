import type { MissionDefinition } from '@/lib/types/domain';

export const mission3: MissionDefinition = {
  id: 3,
  slug: 'simulasi-antrean-kantin',
  title: 'Simulasi Antrean Kantin',
  subtitle: 'Menghitung total waktu layanan multi-loket menggunakan nested loop',
  kkaTopic: 'Pengenalan Pola, Perulangan, & Nested Loop',
  caseNarrative: [
    'Saat jam istirahat, kantin sekolah membuka beberapa loket pelayanan secara bersamaan. Data antrean disimpan dalam struktur daftar 2 dimensi bernama daftar_loket, di mana setiap elemen loket berisi daftar pesanan pelanggan berupa string.',
    'Lama waktu penyajian untuk setiap jenis pesanan adalah:',
    '• "paket_berat" = 4 menit',
    '• "snack" = 2 menit',
    '• "minuman" = 1 menit',
    '• Pesanan selain ketiga jenis tersebut (tidak dikenal) = 0 menit.',
    'Bantu pengelola kantin merancang cara otomatis untuk menghitung total menit pelayanan seluruh pesanan dari semua loket.',
  ].join('\n\n'),
  stages: {
    logic: {
      prompt:
        'Misalkan Loket 1 memiliki pesanan ["paket_berat", "minuman"] dan Loket 2 memiliki pesanan ["snack", "snack", "paket_berat"]. Jelaskan pola proses yang berulang untuk menghitung total waktu layanan seluruh loket agar tetap bisa dipakai walau jumlah loket bertambah menjadi 10 atau 50 loket!',
      rubricCriteria: [
        'Mengenali pola pengulangan dua tingkat: berpindah dari satu loket ke loket lain, lalu memproses setiap pesanan di dalam loket tersebut.',
        'Menyebutkan perlunya wadah penjumlah (akumulator total waktu) yang dimulai dari 0 dan terus ditambahkan.',
        'Memetakan durasi pesanan secara akurat ("paket_berat" = 4, "snack" = 2, "minuman" = 1, lainnya = 0).',
        'Menghitung contoh kasus dengan benar (Loket 1 = 5 menit, Loket 2 = 8 menit, total seluruhnya = 13 menit).',
      ],
      staticHints: {
        EXPLORER:
          'Bayangkan kamu mencatat total menit di sebuah buku catatan yang awalnya tertulis 0, lalu berjalan dari Loket 1 ke Loket 2 sambil mengecek tiap pesanan.',
        BUILDER:
          'Identifikasi dua lapisan pengulangan pada data berbentuk daftar di dalam daftar, serta bagaimana setiap jenis pesanan mengubah total menit.',
        ARCHITECT:
          'Rumuskan pola akumulasi yang bersifat umum (independen terhadap jumlah loket maupun panjang antrean per loket) disertai hasil hitungan contohnya.',
      },
    },
    analysis: {
      prompt:
        'Susun pseudocode menggunakan perulangan bersarang (nested loop) untuk menghitung total_waktu dari daftar_loket: loop luar menelusuri setiap loket, loop dalam menelusuri setiap pesanan pada loket tersebut, diikuti percabangan penambah durasi.',
      rubricCriteria: [
        'Menginisialisasi variabel total_waktu = 0 sebelum loop luar dimulai.',
        'Menuliskan loop luar untuk mengiterasi setiap loket di dalam daftar_loket.',
        'Menuliskan loop dalam untuk mengiterasi setiap pesanan di dalam loket beserta pengecekan durasi 4, 2, 1, atau 0 menit.',
        'Mengembalikan atau menampilkan nilai akhir total_waktu setelah kedua loop selesai.',
      ],
      staticHints: {
        EXPLORER:
          'Pastikan baris total_waktu = 0 ditulis paling atas sebelum loop pertama agar hasil hitungan dari loket sebelumnya tidak terhapus.',
        BUILDER:
          'Di dalam loop untuk setiap loket, letakkan loop kedua untuk membaca setiap pesanan satu per satu lalu tambahkan durasinya ke total_waktu.',
        ARCHITECT:
          'Periksa kembali posisi inisialisasi akumulator dan struktur percabangan di dalam loop dalam agar pesanan tidak dikenal tidak mengganggu penjumlahan.',
      },
    },
    evaluation: {
      edgeCaseScenario:
        'Uji pseudocode-mu terhadap tiga kasus ekstrem berikut: (a) loket kosong di tengah antrean [["paket_berat"], [], ["minuman"]]; (b) seluruh loket kosong [] atau [[], []]; (c) terdapat pesanan tidak dikenal [["snack", "kopi_susu"]].',
      prompt:
        'Telusuri jalannya nested loop milikmu pada ketiga kasus ekstrem di atas! Berapa hasil masing-masing dan mengapa algoritma tidak mengalami error saat menjumpai loket kosong []?',
      rubricCriteria: [
        'Menjelaskan bahwa saat menemui loket kosong [], loop dalam langsung dilewati (0 iterasi) dan lanjut ke loket berikutnya sehingga kasus (a) menghasilkan 5 menit.',
        'Menjelaskan bahwa saat daftar_loket kosong atau semua loket kosong, nilai total_waktu tetap 0 tanpa error.',
        'Menjelaskan bahwa pesanan tidak dikenal seperti "kopi_susu" bernilai 0 (tidak menambah total_waktu) sehingga kasus (c) menghasilkan 2 menit.',
        'Menegaskan bahwa posisi total_waktu = 0 di luar loop mencegah nilai ter-reset ketika melewati loket kosong maupun loket berikutnya.',
      ],
      staticHints: {
        EXPLORER:
          'Saat sebuah loket isinya kosong [], berapa kali loop dalam akan berputar? Apakah program berhenti atau langsung lanjut ke loket berikutnya?',
        BUILDER:
          'Telusuri nilai total_waktu setelah setiap loket pada kasus (a), (b), dan (c), termasuk perlakuan untuk string menu yang tidak terdaftar.',
        ARCHITECT:
          'Verifikasi ketahanan iterasi terhadap list kosong berlapis dan pastikan tidak ada asumsi indeks tetap (seperti loket[0]) yang bisa memicu IndexError.',
      },
    },
    coding: {
      prompt:
        'Implementasikan fungsi Python hitung_total_waktu(daftar_loket) menggunakan nested loop yang mengembalikan integer total menit pelayanan dari seluruh loket.',
      starterCode: [
        'def hitung_total_waktu(daftar_loket):',
        '    # Gunakan nested loop (loop luar untuk loket, loop dalam untuk pesanan)',
        '    # "paket_berat" = 4, "snack" = 2, "minuman" = 1, selain itu = 0',
        '    pass',
      ].join('\n'),
      testCases: [
        {
          id: 'm3-t1',
          label: 'Dua loket dengan kombinasi pesanan normal',
          isEdgeCase: false,
          harnessCode:
            'assert hitung_total_waktu([["paket_berat", "minuman"], ["snack", "snack", "paket_berat"]]) == 13, "Total waktu untuk kedua loket seharusnya 13 menit (5 + 8)"',
          expectedOutput: '13',
        },
        {
          id: 'm3-t2',
          label: 'Tiga loket dengan panjang antrean berbeda',
          isEdgeCase: false,
          harnessCode:
            'assert hitung_total_waktu([["minuman", "snack"], ["paket_berat"], ["minuman", "minuman"]]) == 9, "Total waktu untuk ketiga loket seharusnya 9 menit (3 + 4 + 2)"',
          expectedOutput: '9',
        },
        {
          id: 'm3-t3',
          label: 'Terdapat loket kosong di tengah antrean',
          isEdgeCase: true,
          harnessCode:
            'assert hitung_total_waktu([["paket_berat"], [], ["minuman"]]) == 5, "Loket kosong di tengah harus dilewati aman sehingga total tetap 5 menit"',
          expectedOutput: '5',
        },
        {
          id: 'm3-t4',
          label: 'Daftar loket kosong sepenuhnya',
          isEdgeCase: true,
          harnessCode:
            'assert hitung_total_waktu([]) == 0, "Daftar loket kosong [] seharusnya mengembalikan 0"',
          expectedOutput: '0',
        },
        {
          id: 'm3-t5',
          label: 'Semua loket ada tetapi antreannya kosong',
          isEdgeCase: true,
          harnessCode:
            'assert hitung_total_waktu([[], []]) == 0, "Jika semua loket kosong [[], []], total waktu seharusnya 0"',
          expectedOutput: '0',
        },
        {
          id: 'm3-t6',
          label: 'Pesanan tidak dikenal bernilai 0 menit',
          isEdgeCase: true,
          harnessCode:
            'assert hitung_total_waktu([["snack", "kopi_susu"], ["es_krim", "paket_berat"]]) == 6, "Pesanan tidak dikenal harus dihitung 0 menit sehingga total menjadi 6 menit"',
          expectedOutput: '6',
        },
      ],
      staticHints: {
        EXPLORER:
          'Bayangkan dua lapisan perulangan for: perulangan luar mengambil satu per satu antrean tiap loket, lalu perulangan di dalamnya memeriksa tiap item pesanan sebelum total dikembalikan di bagian akhir fungsi.',
        BUILDER:
          'Periksa indentasi baris return agar berada sejajar dengan loop luar, bukan di dalam loop (yang akan membuat fungsi berhenti lebih cepat).',
        ARCHITECT:
          'Pastikan penanganan string pesanan tidak dikenal aman (menambah 0) dan fungsi tetap mengembalikan integer 0 untuk input list kosong.',
      },
    },
  },
  reflectionQuestion:
    'Kesalahan penempatan baris mana (seperti inisialisasi variabel penjumlah atau baris return) di dalam nested loop yang paling perlu diwaspadai saat memproses daftar 2 dimensi?',
};
