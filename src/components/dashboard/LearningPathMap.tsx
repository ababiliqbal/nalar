'use client';

import Link from 'next/link';
import { ArrowRight, Check, Lock, Play } from 'lucide-react';

import type { MissionCardState } from '@/lib/services/mission-gate.service';
import type { MissionStage } from '@/lib/types/domain';

export interface LearningPathMapProps {
  missions: readonly MissionCardState[];
}

const STAGE_LABELS: Record<MissionStage, string> = {
  logic: 'Tahap 1 · Logic',
  analysis: 'Tahap 2 · Analysis',
  evaluation: 'Tahap 3 · Evaluation',
  coding: 'Tahap 4 · Coding',
};

const ZIGZAG_OFFSET_CLASSES: readonly string[] = [
  'sm:mr-auto sm:ml-0',
  'sm:ml-auto sm:mr-0',
  'sm:mr-auto sm:ml-4',
  'sm:ml-auto sm:mr-4',
  'sm:mx-auto',
];

function CurvedConnector({
  index,
  isCompletedPath,
}: {
  index: number;
  isCompletedPath: boolean;
}) {
  // Mengubah arah kurva S bergantian mengikuti pola zig-zag kartu
  const isLeftToRight = index % 2 === 0;
  const strokeColor = isCompletedPath ? '#16A34A' : '#CBD5E1';

  return (
    <div
      aria-hidden="true"
      className="flex h-12 w-full items-center justify-center sm:h-14"
    >
      <svg
        className="h-full w-48 overflow-visible"
        viewBox="0 0 200 56"
        fill="none"
      >
        <path
          d={
            isLeftToRight
              ? 'M 56 0 C 56 30, 144 26, 144 56'
              : 'M 144 0 C 144 30, 56 26, 56 56'
          }
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={isCompletedPath ? undefined : '6 6'}
        />
      </svg>
    </div>
  );
}

export function LearningPathMap({ missions }: LearningPathMapProps) {
  return (
    <ol aria-label="Jalur Belajar 5 Misi Nalar" className="mt-6 flex flex-col">
      {missions.map((mission, index) => {
        const offsetClass =
          ZIGZAG_OFFSET_CLASSES[index] ?? ZIGZAG_OFFSET_CLASSES[4];
        const isLast = index === missions.length - 1;
        const targetHref = `/missions/${mission.id}/${mission.currentStage}`;

        return (
          <li key={mission.id} className="flex flex-col">
            <div className={`w-full sm:max-w-[440px] ${offsetClass}`}>
              {mission.status === 'locked' ? (
                <div
                  aria-disabled="true"
                  className="flex items-start gap-4 rounded-2xl border border-borderline bg-surface/70 p-4 opacity-75"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-borderline bg-canvas text-ink-muted">
                    <Lock className="h-5 w-5" strokeWidth={2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                        Misi {mission.id}
                      </span>
                      <span className="rounded-md border border-borderline bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                        Terkunci
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-ink-secondary">
                      {mission.title}
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                      {mission.kkaTopic}
                    </p>
                    <p className="mt-2 text-[11.5px] font-medium text-ink-muted">
                      Selesaikan Misi {mission.id - 1} untuk membuka misi ini.
                    </p>
                  </div>
                </div>
              ) : mission.status === 'completed' ? (
                <Link
                  href={targetHref}
                  className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-passed/35 bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-passed hover:shadow-sm"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-passed text-white">
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-passed">
                          Misi {mission.id}
                        </span>
                        <span className="rounded-md border border-passed/30 bg-passed/10 px-2 py-0.5 text-[11px] font-semibold text-passed">
                          Selesai
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-ink-muted">
                        4/4 Tahap
                      </span>
                    </div>

                    <h3 className="mt-1 text-base font-bold text-ink-primary group-hover:text-primary">
                      {mission.title}
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                      {mission.kkaTopic}
                    </p>

                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <span>Tinjau Misi</span>
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                </Link>
              ) : (
                <Link
                  href={targetHref}
                  className="group flex cursor-pointer items-start gap-4 rounded-2xl border-2 border-primary bg-surface p-4 shadow-[0_10px_28px_-18px_rgba(15,118,110,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(15,118,110,0.55)]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                    <Play className="ml-0.5 h-5 w-5" strokeWidth={2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                          Misi {mission.id}
                        </span>
                        <span className="rounded-md border border-primary/25 bg-[#F0FDFA] px-2 py-0.5 text-[11px] font-semibold text-primary">
                          Aktif
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-medium text-ink-secondary">
                        {STAGE_LABELS[mission.currentStage]}
                      </span>
                    </div>

                    <h3 className="mt-1 text-base font-bold text-ink-primary">
                      {mission.title}
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                      {mission.subtitle}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-borderline pt-2.5">
                      <span className="font-mono text-[11px] text-ink-muted">
                        {mission.stagesCompletedCount}/4 tahap lulus
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-primary-hover">
                        <span>
                          {mission.stagesCompletedCount > 0
                            ? 'Lanjutkan'
                            : 'Mulai Misi'}
                        </span>
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                          strokeWidth={2}
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              )}
            </div>

            {!isLast && (
              <CurvedConnector
                index={index}
                isCompletedPath={mission.status === 'completed'}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
