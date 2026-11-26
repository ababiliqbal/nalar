'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Cpu,
  Layers,
  LogIn,
  Network,
  Sparkles,
} from 'lucide-react';

import { HeroPreviewCard } from '@/components/landing/HeroPreviewCard';
import { HeroVisual } from '@/components/landing/HeroVisual';
import { IdentityModal } from '@/components/landing/IdentityModal';

const METHODOLOGY_FEATURES = [
  {
    icon: Layers,
    title: 'Alur 4 Tahap Berurutan',
    description:
      'Susun penalaran mulai dari bahasa sehari-hari (Logic), pseudocode (Analysis), uji kasus ekstrem (Evaluation), hingga menulis Python (Coding) plus refleksi singkat.',
    iconClass: 'border-primary/20 bg-primary/10 text-primary',
  },
  {
    icon: Sparkles,
    title: 'Dual AI Sokratis Adaptif',
    description:
      'Auto-Hint halus di area kerja dan AI Mentor di panel diskusi menyesuaikan level Explorer, Builder, atau Architect—membimbing pola pikir tanpa membocorkan kunci jawaban.',
    iconClass: 'border-amber-200 bg-[#FFFBEB] text-highlight',
  },
  {
    icon: Cpu,
    title: 'Eksekusi Python Aman di Browser',
    description:
      'Kode Python dijalankan langsung di browser lewat Pyodide WebAssembly lengkap dengan unit test otomatis, ringan dipakai di komputer lab sekolah maupun ponsel.',
    iconClass: 'border-blue-200 bg-[#EFF6FF] text-active',
  },
] as const;

export function LandingClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'start' | 'resume'>('start');

  function openModal(mode: 'start' | 'resume') {
    setModalMode(mode);
    setModalOpen(true);
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-canvas text-ink-primary">
      {/* Sticky Navbar 64px — Clean & Uncluttered */}
      <header className="sticky top-0 z-40 h-16 border-b border-borderline bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Network className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-ink-primary">
              Nalar
            </span>
          </div>

          <button
            type="button"
            onClick={() => openModal('resume')}
            className="group inline-flex cursor-pointer items-center gap-2 rounded-xl border border-borderline bg-surface px-3.5 py-2 text-xs font-semibold text-ink-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow-sm active:translate-y-0 sm:px-4 sm:text-sm"
          >
            <LogIn
              className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2}
            />
            <span>Lanjutkan dengan NISN</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* Section 1: Editorial Hero — Typography + Student Subject + Geometric Shapes */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pb-24 lg:pt-16">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="space-y-7 lg:col-span-6">
              <div className="space-y-4">
                <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-ink-primary sm:text-5xl lg:text-[3.25rem]">
                  Bangun Logika Dulu, Baru Tulis Kode{' '}
                  <span className="text-primary">Python</span>.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg">
                  Beralih dari pemrograman blok menuju Python berbasis teks
                  lewat 5 studi kasus kontekstual, tahapan berpikir terstruktur,
                  dan AI Mentor yang memantik nalar tanpa memberi bocoran.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => openModal('start')}
                  className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_10px_24px_-10px_rgba(15,118,110,0.65)] active:translate-y-0"
                >
                  <span>Mulai Belajar Sekarang</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    strokeWidth={2}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => openModal('resume')}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-borderline bg-surface px-5 py-3.5 text-sm font-semibold text-ink-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-canvas hover:text-ink-primary hover:shadow-sm active:translate-y-0"
                >
                  <span>Pulihkan Progres</span>
                </button>
              </div>

              <div className="grid max-w-md grid-cols-3 divide-x divide-borderline border-t border-borderline pt-6">
                <div className="pr-3">
                  <p className="font-mono text-lg font-bold text-ink-primary">
                    5 Misi
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Studi kasus nyata
                  </p>
                </div>
                <div className="px-3 sm:px-4">
                  <p className="font-mono text-lg font-bold text-ink-primary">
                    4 Tahap
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Logic ke Coding
                  </p>
                </div>
                <div className="pl-3 sm:pl-4">
                  <p className="font-mono text-lg font-bold text-ink-primary">
                    3 Level
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Bimbingan adaptif
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* Section 2: Interactive Workspace Preview + 3 Vertical Methodology Features */}
        <section className="border-t border-borderline bg-surface py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="order-2 lg:order-1 lg:col-span-7">
                <HeroPreviewCard />
              </div>

              <div className="order-1 space-y-7 lg:order-2 lg:col-span-5">
                <div className="space-y-3">
                  <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-ink-primary sm:text-3xl">
                    Dirancang agar kamu paham{' '}
                    <span className="text-primary">mengapa</span> kode bekerja
                  </h2>
                  <p className="text-sm leading-relaxed text-ink-secondary sm:text-base">
                    Bukan sekadar menyalin sintaks. Setiap misi melatih cara
                    berpikir komputasional secara bertahap sampai siap diuji di
                    editor Python.
                  </p>
                </div>

                <div className="space-y-5">
                  {METHODOLOGY_FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.title}
                        className="flex items-start gap-4"
                      >
                        <div
                          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${feature.iconClass}`}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-ink-primary">
                            {feature.title}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Bold Teal CTA Band with Organic Contour Lines */}
        <section className="border-t border-borderline bg-canvas py-14 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-white sm:px-12 sm:py-16">
              {/* Subtle Geometric SVG Contour Accent */}
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-15"
                viewBox="0 0 1200 400"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M-60 320 C 180 180, 420 390, 680 220 C 900 80, 1080 240, 1260 120"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M-40 240 C 220 100, 480 310, 740 150 C 940 30, 1100 170, 1260 60"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle
                  cx="1080"
                  cy="310"
                  r="90"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle
                  cx="130"
                  cy="90"
                  r="64"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>

              <div className="relative mx-auto max-w-2xl space-y-5">
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                  Siap Menaklukkan 5 Misi Logika ke Python?
                </h2>
                <p className="mx-auto max-w-xl text-sm leading-relaxed text-teal-50/90 sm:text-base">
                  Mulai dari tes pemetaan singkat 6 soal untuk menyesuaikan gaya
                  bimbingan AI dengan kemampuanmu—tanpa email maupun kata sandi.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => openModal('start')}
                    className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface px-6 py-3.5 text-sm font-bold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-canvas hover:shadow-[0_12px_28px_-10px_rgba(15,23,42,0.35)] active:translate-y-0"
                  >
                    <span>Mulai Belajar Sekarang</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Ultra-Minimalist Footer */}
      <footer className="border-t border-borderline bg-surface py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-center text-xs text-ink-muted sm:flex-row sm:px-6 sm:text-left">
          <div className="flex items-center gap-2 font-semibold text-ink-primary">
            <Network className="h-4 w-4 text-primary" strokeWidth={2} />
            <span>Nalar</span>
          </div>
          <p>Platform Latihan Berpikir Komputasional &amp; Python</p>
        </div>
      </footer>

      <IdentityModal
        isOpen={modalOpen}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
