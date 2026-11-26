'use client';

import { useEffect, useId } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Code2,
  FileCode2,
  Lightbulb,
  ShieldAlert,
  X,
} from 'lucide-react';

export interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GUIDE_STAGES = [
  {
    step: 1,
    name: 'Logic',
    subtitle: 'Penalaran Bahasa Sehari-hari',
    description:
      'Pahami studi kasus dan tuliskan alasan serta alur pemecahan masalah dengan bahasamu sendiri sebelum menyentuh kode.',
    icon: Lightbulb,
    badgeClass: 'border-primary/25 bg-[#F0FDFA] text-primary',
    stepCircleClass: 'bg-primary text-white',
  },
  {
    step: 2,
    name: 'Analysis',
    subtitle: 'Menyusun Pseudocode Terstruktur',
    description:
      'Ubah penalaranmu menjadi langkah algoritma yang rapi memakai struktur INPUT, IF-ELSE, LOOP, dan OUTPUT.',
    icon: FileCode2,
    badgeClass: 'border-primary/25 bg-[#F0FDFA] text-primary',
    stepCircleClass: 'bg-primary text-white',
  },
  {
    step: 3,
    name: 'Evaluation',
    subtitle: 'Uji Kasus Ekstrem & Efisiensi',
    description:
      'Tantang pseudocode-mu dengan kasus batas (edge case) atau bandingkan jumlah langkah algoritma agar tidak ada celah logika.',
    icon: ShieldAlert,
    badgeClass: 'border-amber-200 bg-[#FFFBEB] text-highlight',
    stepCircleClass: 'bg-primary text-white',
  },
  {
    step: 4,
    name: 'Coding & Refleksi',
    subtitle: 'Python + Pengujian Otomatis',
    description:
      'Terjemahkan algoritma teruji ke Python, jalankan unit test otomatis hingga lulus 100%, lalu tutup misi dengan refleksi singkat.',
    icon: Code2,
    badgeClass: 'border-passed/30 bg-passed/10 text-passed',
    stepCircleClass: 'bg-passed text-white',
  },
] as const;

export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-primary/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-borderline bg-surface">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-borderline px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-[#F0FDFA] text-primary">
              <BookOpen className="h-4.5 w-4.5" strokeWidth={2} />
            </div>
            <div>
              <h2
                id={titleId}
                className="text-lg font-bold tracking-tight text-ink-primary"
              >
                Panduan Alur 4 Tahap Nalar
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                Setiap misi diselesaikan berurutan dari logika hingga kode
                Python agar kamu benar-benar memahami cara kerja algoritmamu.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan alur 4 tahap"
            className="cursor-pointer rounded-lg border border-transparent p-1.5 text-ink-muted transition-colors hover:border-borderline hover:bg-canvas hover:text-ink-primary"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* 4 Stages List */}
        <div className="space-y-3 px-5 py-5 sm:px-6">
          {GUIDE_STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="flex items-start gap-3.5 rounded-xl border border-borderline bg-canvas/60 p-4"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${stage.stepCircleClass}`}
                >
                  {stage.step}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-ink-primary">
                      Tahap {stage.step}: {stage.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${stage.badgeClass}`}
                    >
                      <Icon className="h-3 w-3" strokeWidth={2} />
                      {stage.subtitle}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary sm:text-[13px]">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="flex items-start gap-2.5 rounded-xl border border-passed/25 bg-passed/5 px-4 py-3 text-xs leading-relaxed text-ink-secondary">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-passed"
              strokeWidth={2}
            />
            <span>
              <strong className="font-semibold text-ink-primary">
                Aturan Kunci Berurutan:
              </strong>{' '}
              Tahap berikutnya otomatis terbuka setelah tahap aktif lulus
              evaluasi. Misi berikutnya terbuka setelah kamu menuntaskan Coding
              dan Refleksi singkat.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-borderline px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-primary-hover"
          >
            Mengerti, Siap Belajar
          </button>
        </div>
      </div>
    </div>
  );
}
