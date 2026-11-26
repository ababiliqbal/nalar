import type { MissionDefinition } from '@/lib/types/domain';

const BUGGY_CASHIER_CODE = [
  'def hitung_total_bayar(daftar_harga, is_member):',
  '    if len(daftar_harga) == 0',
  '        return 0',
  '',
  '    subtotal = 0',
  '    for harga in daftar_harga:',
  '        subtotal = subtotal + harga',
  '',
  '    total_diskon = 0',
  '    if subtotal > 100000:',
  '        total_diskon = total_diskon + subtotal * 0.10',
  '',
  '    if is_member:',
  '        total_diskon = total_diskon + subtotal * 0.05',
  '',
  '    return int(subtotal + total_diskon)',
].join('\n');

export const mission5: MissionDefinition = {
  id: 5,
  slug: 'kasir-cerdas-tanpa-bug',
  title: 'Kasir Cerdas Tanpa Bug',
  subtitle: 'Mengintegrasikan perulangan & logika diskon sekaligus melacak bug kode',
  kkaTopic: 'Integrasi Logika, Perulangan, & Debugging (AP-K10-09..11)',
  caseNarrative: [
    'Koperasi sekolah membuat fungsi Python hitung_total_bayar(daftar_harga, is_member) untuk menghitung total pembayaran belanja siswa dengan aturan kasir berikut:',
    '• Jika daftar_harga kosong, kembalikan 0.',
    '• Jumlahkan seluruh harga barang di dalam daftar_harga untuk mendapatkan subtotal.',
    '• Jika subtotal >= 100000, pembeli memperoleh diskon belanja sebesar 10% dari subtotal.',
    '• Jika is_member bernilai True, pembeli memperoleh tambahan diskon member sebesar 5% dari subtotal awal (sehingga diskon maksimal yang bisa didapat adalah 15%).',
    '• Kembalikan total bayar akhir dalam bilangan bulat: int(subtotal - total_diskon).',
    'Namun, draf kode awal yang ditulis panitia berikut masih mengandung beberapa kesalahan (bug sintaks dan bug logika):',
    '```python\n' + BUGGY_CASHIER_CODE + '\n```',
  ].join('\n\n'),
  stages: {
    logic: {
      prompt:
        'Seorang member koperasi membeli 3 barang seharga Rp40.000, Rp35.000, dan Rp25.000. Hitung secara runtut berapa subtotalnya, diskon apa saja yang berlaku (termasuk alasan mengapa batas Rp100.000 berhak mendapat diskon), serta total akhir yang harus dibayar!',
      rubricCriteria: [
        'Menghitung subtotal dengan benar dari penjumlahan seluruh barang (40.000 + 35.000 + 25.000 = 100.000).',
        'Menjelaskan bahwa subtotal tepat Rp100.000 memenuhi syarat diskon belanja 10% (Rp10.000).',
        'Menambahkan diskon member 5% dari subtotal awal (Rp5.000) sehingga total diskon menjadi Rp15.000 (15%).',
        'Mengurangkan total diskon dari subtotal untuk mendapatkan total bayar akhir sebesar Rp85.000.',
      ],
      staticHints: {
        EXPLORER:
          'Jumlahkan ketiga harga barang terlebih dahulu, lalu cek apakah hasilnya sudah mencapai minimal Rp100.000 dan apakah pembeli berstatus member.',
        BUILDER:
          'Ingat bahwa diskon belanja 10% dan diskon member 5% keduanya dihitung dari subtotal awal, lalu gabungkan keduanya untuk mengurangi subtotal.',
        ARCHITECT:
          'Pastikan perhitunganmu memverifikasi kondisi batas tepat Rp100.000 serta sifat kumulatif kedua potongan (maksimal 15% dari subtotal awal).',
      },
    },
    analysis: {
      prompt:
        'Tuliskan pseudocode yang benar dan bersih untuk fungsi hitung_total_bayar(daftar_harga, is_member), mulai dari pengecekan daftar kosong, perulangan hitung subtotal, dua pemeriksaan diskon independen, hingga perhitungan hasil akhir.',
      rubricCriteria: [
        'Menangani kondisi awal daftar_harga kosong dengan langsung mengembalikan 0.',
        'Menggunakan perulangan untuk menjumlahkan setiap harga ke dalam variabel subtotal.',
        'Menggunakan dua blok IF terpisah (bukan IF-ELIF) untuk mengecek subtotal >= 100000 (10%) dan is_member (5%) agar keduanya bisa aktif bersamaan.',
        'Menghitung hasil akhir dengan pengurangan subtotal - total_diskon lalu mengembalikannya sebagai integer.',
      ],
      staticHints: {
        EXPLORER:
          'Pisahkan pengecekan diskon belanja dan diskon member menjadi dua blok IF tersendiri supaya pembeli member yang belanja >= 100.000 bisa mendapat keduanya.',
        BUILDER:
          'Susun langkah berurutan: cek kosong -> loop hitung subtotal -> cek dua syarat diskon terhadap subtotal awal -> kurangkan total_diskon.',
        ARCHITECT:
          'Pastikan kedua syarat diskon bersifat independen dan batas diskon belanja mencakup tepat 100.000 secara inklusif.',
      },
    },
    evaluation: {
      edgeCaseScenario:
        'Amati draf kode ber-bug pada narasi kasus di atas dan telusuri perilakunya pada kasus batas tepat subtotal == 100000 (contoh: daftar_harga = [60000, 40000], is_member = False).',
      prompt:
        'Identifikasi minimal 3 kesalahan (gabungan bug sintaks dan bug logika) pada draf kode kasir di narasi kasus! Jelaskan dampak tiap kesalahan saat program dijalankan, khususnya pada kasus batas subtotal == 100000.',
      rubricCriteria: [
        'Mengidentifikasi bug sintaks pada baris pengecekan daftar kosong (kurang tanda titik dua ":" di akhir pernyataan if).',
        'Mengidentifikasi bug logika perbandingan pada batas 100000 (memakai > yang seharusnya >=, sehingga subtotal tepat 100000 gagal mendapat diskon 10%).',
        'Mengidentifikasi bug logika rumus akhir (menambahkan total_diskon ke subtotal, seharusnya mengurangkan subtotal dengan total_diskon).',
        'Menyimpulkan bahwa untuk [60000, 40000] non-member, total bayar yang benar seharusnya Rp90.000.',
      ],
      staticHints: {
        EXPLORER:
          'Baca kode panitia pelan-pelan dari atas ke bawah: cek kelengkapan tanda baca Python di setiap blok if, kecocokan syarat batas minimal belanja, dan arah operasi hitung diskon di akhir fungsi.',
        BUILDER:
          'Bedakan kesalahan yang memicu SyntaxError sebelum kode berjalan dengan dua kesalahan logika yang baru terlihat ketika hasilnya dibandingkan dengan aturan kasir.',
        ARCHITECT:
          'Audit seluruh struktur kontrol, operator batas, dan formula pengembalian nilai terhadap skenario batas subtotal == 100000.',
      },
    },
    coding: {
      prompt:
        'Kode awal di editor masih mengandung 3 bug terencana (sintaks dan logika). Lakukan debugging dan perbaiki fungsi hitung_total_bayar(daftar_harga, is_member) hingga seluruh kasus pengujian kasir lulus!',
      starterCode: BUGGY_CASHIER_CODE,
      testCases: [
        {
          id: 'm5-t1',
          label: 'Belanja di bawah Rp100.000 untuk non-member (tanpa diskon)',
          isEdgeCase: false,
          harnessCode:
            'assert hitung_total_bayar([30000, 20000], False) == 50000, "Subtotal 50000 untuk non-member seharusnya tetap 50000"',
          expectedOutput: '50000',
        },
        {
          id: 'm5-t2',
          label: 'Belanja di bawah Rp100.000 untuk member (diskon 5%)',
          isEdgeCase: false,
          harnessCode:
            'assert hitung_total_bayar([30000, 20000], True) == 47500, "Subtotal 50000 untuk member (diskon 5%) seharusnya menghasilkan 47500"',
          expectedOutput: '47500',
        },
        {
          id: 'm5-t3',
          label: 'Belanja di atas Rp100.000 untuk non-member (diskon 10%)',
          isEdgeCase: false,
          harnessCode:
            'assert hitung_total_bayar([80000, 40000], False) == 108000, "Subtotal 120000 untuk non-member (diskon 10%) seharusnya menghasilkan 108000"',
          expectedOutput: '108000',
        },
        {
          id: 'm5-t4',
          label: 'Belanja di atas Rp100.000 untuk member (diskon total 15%)',
          isEdgeCase: false,
          harnessCode:
            'assert hitung_total_bayar([80000, 40000], True) == 102000, "Subtotal 120000 untuk member (diskon 10% + 5% = 15%) seharusnya menghasilkan 102000"',
          expectedOutput: '102000',
        },
        {
          id: 'm5-t5',
          label: 'Kasus batas subtotal tepat Rp100.000 non-member',
          isEdgeCase: true,
          harnessCode:
            'assert hitung_total_bayar([60000, 40000], False) == 90000, "Subtotal tepat 100000 untuk non-member harus mendapat diskon 10% sehingga menjadi 90000"',
          expectedOutput: '90000',
        },
        {
          id: 'm5-t6',
          label: 'Kasus batas subtotal tepat Rp100.000 member',
          isEdgeCase: true,
          harnessCode:
            'assert hitung_total_bayar([40000, 35000, 25000], True) == 85000, "Subtotal tepat 100000 untuk member harus mendapat diskon 15% sehingga menjadi 85000"',
          expectedOutput: '85000',
        },
        {
          id: 'm5-t7',
          label: 'Kasus ekstrem daftar belanja kosong',
          isEdgeCase: true,
          harnessCode:
            'assert hitung_total_bayar([], True) == 0, "Jika daftar_harga kosong [], total bayar seharusnya 0 meskipun is_member bernilai True"',
          expectedOutput: '0',
        },
      ],
      staticHints: {
        EXPLORER:
          'Mulai dari pesan SyntaxError paling awal di terminal, lalu setelah kode bisa berjalan, perhatikan mengapa total bayar lebih besar dari subtotal atau gagal di angka tepat 100000.',
        BUILDER:
          'Bandingkan setiap baris yang gagal pada pesan assert terhadap tiga temuan bug yang sudah kamu catat di Tahap Evaluation.',
        ARCHITECT:
          'Verifikasi tiga lapisan perbaikan secara sistematis: kelengkapan sintaks struktur kontrol, inklusivitas syarat batas diskon, dan kebenaran formula akhir sebelum dikembalikan.',
      },
    },
  },
  reflectionQuestion:
    'Mengapa bug logika (seperti salah tanda > atau salah tambah/kurang diskon) lebih sulit dideteksi dibanding SyntaxError, dan strategi apa yang paling membantumu menemukannya?',
};
