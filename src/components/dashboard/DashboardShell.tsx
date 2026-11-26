'use client';

import { useState } from 'react';
import {
  BookOpen,
  Map as MapIcon,
  Network,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';

import { GuideModal } from '@/components/dashboard/GuideModal';
import { LearningPathMap } from '@/components/dashboard/LearningPathMap';
import { SwitchStudentButton } from '@/components/dashboard/SwitchStudentButton';
import { SCAFFOLDING_LEVELS } from '@/lib/constants/levels';
import type { DashboardData } from '@/lib/services/mission-gate.service';

export interface DashboardShellProps {
  data: DashboardData;
}

export function DashboardShell({ data }: DashboardShellProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  const levelConfig = SCAFFOLDING_LEVELS[data.student.currentLevel];

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink-primary lg:flex-row">
      {/* Mobile / Tablet Top Bar (< 1024px, height 56px) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-borderline bg-surface/95 px-4 backdrop-blur-sm lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Network className="h-4 w-4" strokeWidth={2} />
          </div>
          <span className="text-base font-extrabold tracking-tight text-ink-primary">
            Nalar
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-borderline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-primary transition-colors hover:border-primary/40 hover:bg-canvas"
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            <span>Panduan</span>
          </button>
          <SwitchStudentButton variant="topbar" />
        </div>
      </header>

      {/* Desktop Left Sidebar (230px fixed) */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[230px] lg:shrink-0 lg:flex-col lg:justify-between lg:border-r lg:border-borderline lg:bg-surface lg:p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Network className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-ink-primary">
              Nalar
            </span>
          </div>

          <nav aria-label="Navigasi utama dashboard" className="space-y-1.5">
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-[#F0FDFA] px-3.5 py-2.5 text-sm font-bold text-primary">
              <MapIcon className="h-4 w-4" strokeWidth={2} />
              <span>Peta Belajar</span>
            </div>

            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3.5 py-2.5 text-left text-sm font-semibold text-ink-secondary transition-colors hover:border-borderline hover:bg-canvas hover:text-ink-primary"
            >
              <BookOpen className="h-4 w-4 text-primary" strokeWidth={2} />
              <span>Panduan Alur 4 Tahap</span>
            </button>
          </nav>
        </div>

        <div className="border-t border-borderline pt-4">
          <SwitchStudentButton variant="sidebar" />
        </div>
      </aside>

      {/* Center Column + Right Panel Wrapper */}
      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:py-8">
        {/* Center Column: Module Banner + 5-Mission Learning Path (max-w-[540px]) */}
        <main className="mx-auto w-full max-w-[540px] flex-1">
          <section
            aria-label="Banner Modul 1"
            className="relative overflow-hidden rounded-2xl bg-primary px-5 py-5 text-white sm:px-6 sm:py-6"
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-15"
              viewBox="0 0 600 180"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M-20 140 C 120 70, 260 175, 420 90 C 500 50, 560 95, 620 40"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle
                cx="530"
                cy="135"
                r="48"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>

            <div className="relative space-y-1.5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-teal-100">
                MODUL 1
              </p>
              <h1 className="text-xl font-extrabold leading-snug tracking-tight sm:text-2xl">
                Berpikir Komputasional &amp; Transisi Python
              </h1>
              <p className="text-xs leading-relaxed text-teal-50/90 sm:text-sm">
                Selesaikan 5 misi berurutan mulai dari logika, pseudocode, uji
                kasus ekstrem, hingga pemrograman Python.
              </p>
            </div>
          </section>

          <LearningPathMap missions={data.missions} />
        </main>

        {/* Right Panel (Desktop 290px sticky) — 3 Cards */}
        <aside
          aria-label="Ringkasan Profil dan Progres Siswa"
          className="mx-auto w-full max-w-[540px] space-y-4 lg:sticky lg:top-8 lg:mx-0 lg:w-[290px] lg:shrink-0"
        >
          {/* Card 1: Identitas Siswa */}
          <section className="rounded-2xl border border-borderline bg-surface p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
              <UserRound className="h-4 w-4 text-primary" strokeWidth={2} />
              <span>Identitas Siswa</span>
            </div>

            <div className="space-y-1">
              <p className="text-base font-bold text-ink-primary">
                {data.student.nama}
              </p>
              <p className="text-xs font-medium text-ink-secondary">
                Kelas {data.student.kelas} &bull; {data.student.sekolah}
              </p>
              <p className="pt-1 font-mono text-xs text-ink-muted">
                NISN: {data.student.nisn}
              </p>
            </div>
          </section>

          {/* Card 2: Mode Bimbingan AI */}
          <section className="rounded-2xl border border-borderline bg-surface p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
              <span>Mode Bimbingan AI</span>
            </div>

            <div className="space-y-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${levelConfig.badge.className}`}
              >
                <span>{levelConfig.label}</span>
              </span>
              <p className="text-xs leading-relaxed text-ink-secondary">
                {levelConfig.description}
              </p>
            </div>
          </section>

          {/* Card 3: Progres Misi */}
          <section className="rounded-2xl border border-borderline bg-surface p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <Trophy className="h-4 w-4 text-passed" strokeWidth={2} />
                <span>Progres Misi</span>
              </div>
              <span className="font-mono text-sm font-extrabold text-primary">
                {data.percent}%
              </span>
            </div>

            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-borderline"
              role="progressbar"
              aria-valuenow={data.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progres misi: ${data.completedCount} dari 5 misi selesai`}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${data.percent}%` }}
              />
            </div>

            <p className="mt-2.5 font-mono text-xs font-semibold text-ink-secondary">
              {data.completedCount} / {data.totalMissions} Misi Selesai
            </p>
          </section>
        </aside>
      </div>

      <GuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
