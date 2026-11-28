'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Lock, Sparkles } from 'lucide-react';

import { SCAFFOLDING_LEVELS } from '@/lib/constants/levels';
import {
  STAGE_META,
  computeStepperStates,
  type MissionId,
  type StagePassFlags,
} from '@/lib/missions/workspace-helpers';
import type { MissionStage, ScaffoldingLevelCode } from '@/lib/types/domain';

export interface WorkspaceHeaderProps {
  missionId: MissionId;
  missionTitle: string;
  activeStage: MissionStage;
  progress: StagePassFlags;
  currentLevel: ScaffoldingLevelCode;
}

export function WorkspaceHeader({
  missionId,
  missionTitle,
  activeStage,
  progress,
  currentLevel,
}: WorkspaceHeaderProps) {
  const stepperItems = computeStepperStates(progress, activeStage);
  const activeMeta = STAGE_META[activeStage];
  const levelConfig = SCAFFOLDING_LEVELS[currentLevel];
  const compactLevelLabel = `AI: ${levelConfig.label.replace(':', '')}`;

  return (
    <div className="shrink-0">
      <header className="flex h-[68px] shrink-0 items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-4 sm:px-6">
        {/* Left: Back to Dashboard + Mission Title */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F766E] sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Peta Belajar</span>
          </Link>

          <span
            aria-hidden="true"
            className="h-5 w-px shrink-0 bg-[#E2E8F0]"
          />

          <p className="truncate text-sm font-bold text-[#0F172A] sm:text-[15px]">
            Misi {missionId}: {missionTitle}
          </p>
        </div>

        {/* Center: Horizontal 4-Stage Stepper (>= md) */}
        <nav
          aria-label="Tahapan misi"
          className="hidden h-full shrink-0 items-center gap-1 md:flex lg:gap-2"
        >
          {stepperItems.map((item) => {
            const href = `/missions/${missionId}/${item.stage}`;

            if (item.state === 'active') {
              return (
                <span
                  key={item.stage}
                  aria-current="step"
                  className="inline-flex h-full items-center gap-1.5 border-b-2 border-[#0F766E] px-2.5 text-xs font-bold text-[#0F766E] lg:px-3 lg:text-[13px]"
                >
                  <span>{item.label}</span>
                </span>
              );
            }

            if (item.state === 'passed') {
              return (
                <Link
                  key={item.stage}
                  href={href}
                  className="inline-flex h-full cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-2.5 text-xs font-semibold text-[#16A34A] transition-colors hover:border-[#16A34A]/40 hover:bg-[#16A34A]/5 lg:px-3 lg:text-[13px]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span>{item.label}</span>
                </Link>
              );
            }

            if (item.state === 'unlocked') {
              return (
                <Link
                  key={item.stage}
                  href={href}
                  className="inline-flex h-full cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-2.5 text-xs font-semibold text-[#475569] transition-colors hover:border-[#CBD5E1] hover:text-[#0F766E] lg:px-3 lg:text-[13px]"
                >
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <span
                key={item.stage}
                aria-disabled="true"
                className="inline-flex h-full cursor-not-allowed items-center gap-1 border-b-2 border-transparent px-2.5 text-xs font-medium text-[#94A3B8] lg:px-3 lg:text-[13px]"
              >
                <Lock className="h-3 w-3 shrink-0" strokeWidth={2} />
                <span>{item.label}</span>
              </span>
            );
          })}
        </nav>

        {/* Right: Canonical AI Level Badge */}
        <div className="shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold sm:px-3 sm:text-xs ${levelConfig.badge.className}`}
          >
            <Sparkles className="h-3 w-3 shrink-0" strokeWidth={2} />
            <span className="whitespace-nowrap">{compactLevelLabel}</span>
          </span>
        </div>
      </header>

      {/* Mobile Compact Stage Indicator Strip (< md) */}
      <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-xs md:hidden">
        <span className="font-bold text-[#0F766E]">
          Tahap {activeMeta.stepNumber}: {activeMeta.shortLabel}
        </span>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {stepperItems.map((item) => {
              const href = `/missions/${missionId}/${item.stage}`;
              if (item.state === 'active') {
                return (
                  <span
                    key={item.stage}
                    aria-current="step"
                    className="flex h-5 w-5 items-center justify-center rounded-md bg-[#0F766E] font-mono text-[10px] font-bold text-white"
                  >
                    {item.stepNumber}
                  </span>
                );
              }
              if (item.isClickable) {
                return (
                  <Link
                    key={item.stage}
                    href={href}
                    aria-label={`Buka ${item.label}`}
                    className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                      item.state === 'passed'
                        ? 'border border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]'
                        : 'border border-[#E2E8F0] bg-white text-[#475569]'
                    }`}
                  >
                    {item.stepNumber}
                  </Link>
                );
              }
              return (
                <span
                  key={item.stage}
                  aria-disabled="true"
                  className="flex h-5 w-5 cursor-not-allowed items-center justify-center rounded-md border border-[#E2E8F0] bg-white font-mono text-[10px] font-medium text-[#94A3B8]"
                >
                  {item.stepNumber}
                </span>
              );
            })}
          </div>
          <span className="font-mono font-semibold text-[#475569]">
            {activeMeta.stepNumber} / 4
          </span>
        </div>
      </div>
    </div>
  );
}
