import type { MissionDefinition } from '@/lib/types/domain';

export const mission4: MissionDefinition = {
  id: 4,
  slug: 'pencarian-nilai-dan-efisiensi',
  title: 'Pencarian Nilai Tertinggi & Efisiensi',
  subtitle: 'Mengolah array nilai dan membandingkan Sequential Search vs Binary Search',
  kkaTopic: 'Array (List), Pencarian, & Perbandingan Algoritma (TP 3.1)',
  caseNarrative: [
    'Panitia ujian sekolah menyimpan rekap nilai siswa dalam bentuk list angka bernama daftar_nilai. Untuk fitur pencarian cepat, panitia juga menyiapkan salinan daftar yang sudah urut dari nilai terkecil ke terbesar bernama daftar_terurut.',
    'Kamu diminta membuat dua fitur pencarian yang cepat dan rapi:',
    '1. Menemukan nilai tertinggi dari daftar_nilai (mengembalikan None jika daftar kosong).',
    '2. Mencari posisi indeks sebuah nilai target pada daftar_terurut menggunakan Binary Search dengan membagi dua wilayah pencarian di setiap langkah (mengembalikan indeks integer jika ditemukan, atau -1 jika tidak ditemukan).',
  ].join('\n\n'),
  stages: {
    logic: {
      prompt:
        'Jelaskan dengan bahasa sehari-hari: (1) bagaimana strategi menemukan nilai terbesar pada setumpuk kartu nilai secara berurutan; dan (2) bagaimana cara kerja pencarian bagi-dua (Binary Search) pada data yang sudah urut sehingga lebih cepat dibanding memeriksa satu per satu dari awal.',
      rubricCriteria: [
        'Menjelaskan strategi mencari nilai tertinggi dengan menyimpan satu nilai terbesar sementara lalu membandingkannya dengan elemen berikutnya satu per satu.',
        'Menyebutkan prasyarat mutlak Binary Search, yaitu data harus sudah tersusun terurut.',
        'Menjelaskan cara membandingkan target dengan elemen tengah untuk membuang setengah ruang pencarian (ke kiri jika target lebih kecil, ke kanan jika target lebih besar).',
        'Menjelaskan kapan pencarian berhenti (saat target ditemukan atau saat wilayah pencarian sudah habis).',
      ],
      staticHints: {
        EXPLORER:
          'Bayangkan kamu mencari halaman 320 di buku 500 halaman: apakah kamu membuka dari halaman 1 satu per satu, atau langsung membuka bagian tengah buku?',
        BUILDER:
          'Uraikan dua hal secara terpisah: proses memperbarui nilai maksimum sementara, dan alasan setengah data bisa langsung dibuang pada setiap langkah Binary Search.',
        ARCHITECT:
          'Jelaskan syarat keterurutan data serta mekanisme penyempitan batas ruang pencarian hingga kondisi terminasi tercapai.',
      },
    },
    analysis: {
      prompt:
        'Tuliskan pseudocode untuk dua fungsi: (1) cari_tertinggi(daftar_nilai) yang menangani list kosong dan memakai loop; serta (2) cari_binary(daftar_terurut, target) menggunakan batas kiri, kanan, indeks tengah = (kiri + kanan) // 2, dan loop WHILE kiri <= kanan.',
      rubricCriteria: [
        'Pada cari_tertinggi, mengecek apakah daftar_nilai kosong (kembalikan None) dan memperbarui variabel tertinggi memakai perulangan.',
        'Pada cari_binary, menginisialisasi kiri = 0 dan kanan = panjang(daftar_terurut) - 1 dengan kondisi perulangan WHILE kiri <= kanan.',
        'Menghitung indeks tengah dan membandingkan daftar_terurut[tengah] dengan target untuk mengembalikan tengah, atau menggeser kiri = tengah + 1 / kanan = tengah - 1.',
        'Mengembalikan -1 setelah perulangan selesai jika target tidak ditemukan.',
      ],
      staticHints: {
        EXPLORER:
          'Untuk cari_tertinggi, jadikan elemen pertama daftar sebagai nilai tertinggi awal (setelah memastikan daftar tidak kosong), lalu bandingkan dengan elemen sisanya.',
        BUILDER:
          'Pada Binary Search, ingat bahwa saat elemen tengah bukan target, batas baru harus bergeser melewati indeks tengah agar ruang pencarian selalu menyusut dan loop tidak macet.',
        ARCHITECT:
          'Verifikasi invarian batas kiri dan kanan pada pseudocode Binary Search-mu agar tidak terjadi kesalahan off-by-one saat target berada di ujung indeks.',
      },
    },
    evaluation: {
      edgeCaseScenario:
        'Sekolah memiliki 1.000 data nilai ujian yang sudah terurut menaik. Bandingkan jumlah langkah pengecekan maksimum (kasus terburuk) antara Sequential Search dan Binary Search! Lalu telusuri apa yang terjadi pada algoritmamu bila target tidak ada di daftar atau daftar kosong [].',
      prompt:
        'Bandingkan jumlah langkah maksimum Sequential Search vs Binary Search untuk 1.000 data terurut, serta jelaskan perilaku kedua fungsimu saat target tidak ditemukan dan saat input berupa list kosong []!',
      rubricCriteria: [
        'Menyatakan jumlah langkah maksimum Sequential Search pada 1.000 data adalah 1.000 langkah (linear terhadap banyak data).',
        'Menyatakan jumlah langkah maksimum Binary Search pada 1.000 data jauh lebih sedikit, yaitu sekitar 10 langkah (karena 2^10 = 1.024).',
        'Menjelaskan bahwa ketika target tidak ditemukan, nilai kiri akan melampaui kanan sehingga loop berhenti aman dan mengembalikan -1.',
        'Menjelaskan hasil pada list kosong []: cari_tertinggi mengembalikan None dan cari_binary langsung mengembalikan -1.',
      ],
      staticHints: {
        EXPLORER:
          'Coba bagi angka 1.000 dengan 2 secara berulang sampai tersisa 1 elemen: berapa kali pembagian yang terjadi dibanding memeriksa satu per satu hingga 1.000 kali?',
        BUILDER:
          'Hitung perbandingan jumlah langkah terburuk (1.000 vs pangkat dua terdekat), lalu cek apa nilai kiri dan kanan saat list kosong [].',
        ARCHITECT:
          'Kaitkan perbandingan efisiensi kedua algoritma dengan pola penyempitan ruang pencarian di setiap langkah, lalu buktikan bahwa loop pasti berhenti saat target tidak ada.',
      },
    },
    coding: {
      prompt:
        'Lengkapi dua fungsi Python di bawah ini: cari_tertinggi(daftar_nilai) (menggunakan perulangan, kembalikan None jika kosong) dan cari_binary(daftar_terurut, target) (mengembalikan indeks integer atau -1 jika tidak ditemukan).',
      starterCode: [
        'def cari_tertinggi(daftar_nilai):',
        '    # Kembalikan None jika daftar_nilai kosong',
        '    # Selain itu, cari dan kembalikan nilai terbesar menggunakan perulangan',
        '    pass',
        '',
        '',
        'def cari_binary(daftar_terurut, target):',
        '    # Implementasikan Binary Search pada daftar_terurut yang sudah urut menaik',
        '    # Kembalikan indeks integer jika target ditemukan, atau -1 jika tidak ditemukan',
        '    pass',
      ].join('\n'),
      testCases: [
        {
          id: 'm4-t1',
          label: 'Mencari nilai tertinggi pada daftar normal dan negatif',
          isEdgeCase: false,
          harnessCode:
            'assert cari_tertinggi([72, 95, 81, 64, 88]) == 95 and cari_tertinggi([-10, -3, -25]) == -3, "cari_tertinggi harus mengembalikan nilai terbesar (95 dan -3); hindari inisialisasi maksimum awal dengan 0"',
          expectedOutput: '95, -3',
        },
        {
          id: 'm4-t2',
          label: 'Binary Search menemukan target di bagian tengah daftar',
          isEdgeCase: false,
          harnessCode:
            'assert cari_binary([50, 60, 70, 80, 90, 100], 80) == 3, "Target 80 berada pada indeks 3 di [50, 60, 70, 80, 90, 100]"',
          expectedOutput: '3',
        },
        {
          id: 'm4-t3',
          label: 'Binary Search menemukan target di ujung kiri dan ujung kanan',
          isEdgeCase: true,
          harnessCode:
            'assert cari_binary([50, 60, 70, 80, 90, 100], 50) == 0 and cari_binary([50, 60, 70, 80, 90, 100], 100) == 5, "Target di ujung kiri (indeks 0) dan ujung kanan (indeks 5) harus tetap ditemukan"',
          expectedOutput: '0, 5',
        },
        {
          id: 'm4-t4',
          label: 'Binary Search saat target tidak ada di dalam daftar',
          isEdgeCase: true,
          harnessCode:
            'assert cari_binary([50, 60, 70, 80, 90, 100], 75) == -1 and cari_binary([50, 60, 70, 80, 90, 100], 110) == -1, "Jika target tidak ada di daftar, cari_binary harus mengembalikan -1"',
          expectedOutput: '-1',
        },
        {
          id: 'm4-t5',
          label: 'Kasus ekstrem daftar kosong [] pada kedua fungsi',
          isEdgeCase: true,
          harnessCode:
            'assert cari_tertinggi([]) is None and cari_binary([], 80) == -1, "Pada daftar kosong [], cari_tertinggi harus mengembalikan None dan cari_binary mengembalikan -1"',
          expectedOutput: 'None, -1',
        },
        {
          id: 'm4-t6',
          label: 'Kasus ekstrem daftar berisi tepat 1 elemen',
          isEdgeCase: true,
          harnessCode:
            'assert cari_tertinggi([77]) == 77 and cari_binary([77], 77) == 0, "Pada daftar 1 elemen [77], cari_tertinggi harus 77 dan cari_binary untuk 77 harus mengembalikan indeks 0"',
          expectedOutput: '77, 0',
        },
      ],
      staticHints: {
        EXPLORER:
          'Pada Python, pembagian bulat untuk indeks tengah memakai operator //, sedangkan nilai kosong ditulis None (huruf N kapital).',
        BUILDER:
          'Cek kembali kondisi berhenti perulangan while saat batas kiri dan kanan bertemu di satu elemen, serta pastikan pembaruan batas selalu melewati indeks tengah agar tidak terjebak perulangan tak berujung.',
        ARCHITECT:
          'Cek apakah inisialisasi nilai maksimum awal mengambil elemen pertama daftar (bukan 0) dan apakah batas Binary Search aman dari infinite loop.',
      },
    },
  },
  reflectionQuestion:
    'Apa perbedaan utama efisiensi Binary Search dibanding Sequential Search pada data besar, dan celah bug batas indeks apa yang paling menantang kamu selesaikan pada misi ini?',
};
