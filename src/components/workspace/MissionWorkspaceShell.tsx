'use client';

import { useState } from 'react';
import { AlertTriangle, Bot, FileEdit, X } from 'lucide-react';

import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import type {
  PublicMissionStagePayload,
  StagePassFlags,
} from '@/lib/missions/workspace-helpers';
import type { ScaffoldingLevelCode } from '@/lib/types/domain';

export interface MissionWorkspaceShellProps {
  payload: PublicMissionStagePayload;
  progress: StagePassFlags;
  currentLevel: ScaffoldingLevelCode;
  notice?: string;
  hasUnreadMentor?: boolean;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function MissionWorkspaceShell({
  payload,
  progress,
  currentLevel,
  notice,
  hasUnreadMentor = false,
  leftPanel,
  rightPanel,
}: MissionWorkspaceShellProps) {
  const [activeTab, setActiveTab] = useState<'work' | 'mentor'>('work');
  const [dismissedNotice, setDismissedNotice] = useState(false);

  const showStageLockedNotice = notice === 'stage-locked' && !dismissedNotice;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] lg:h-screen lg:overflow-hidden">
      <WorkspaceHeader
        missionId={payload.missionId}
        missionTitle={payload.title}
        activeStage={payload.stage}
        progress={progress}
        currentLevel={currentLevel}
      />

      {/* Slim Dismissible Stage-Locked Banner */}
      {showStageLockedNotice && (
        <div
          role="status"
          className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-[#D97706] sm:px-6"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>
              Selesaikan dan lulus evaluasi pada tahap saat ini terlebih dahulu
              untuk membuka tahap berikutnya.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDismissedNotice(true)}
            aria-label="Tutup pemberitahuan tahap terkunci"
            className="cursor-pointer rounded-md p-1 text-[#D97706] transition-colors hover:bg-amber-100"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Sticky 2-Tab Switcher for Tablet & Mobile (< 1024px) */}
      <div
        role="tablist"
        aria-label="Navigasi panel ruang kerja"
        className="sticky top-0 z-30 grid grid-cols-2 border-b border-[#E2E8F0] bg-white lg:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'work'}
          onClick={() => setActiveTab('work')}
          className={`flex cursor-pointer items-center justify-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors sm:text-sm ${
            activeTab === 'work'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-[#475569] hover:text-[#0F172A]'
          }`}
        >
          <FileEdit className="h-4 w-4" strokeWidth={2} />
          <span>Area Kerja</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mentor'}
          onClick={() => setActiveTab('mentor')}
          className={`relative flex cursor-pointer items-center justify-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors sm:text-sm ${
            activeTab === 'mentor'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-[#475569] hover:text-[#0F172A]'
          }`}
        >
          <Bot className="h-4 w-4" strokeWidth={2} />
          <span>AI Mentor</span>
          {hasUnreadMentor && activeTab !== 'mentor' && (
            <span
              aria-label="Ada balasan baru dari AI Mentor"
              className="h-2 w-2 rounded-full bg-[#0F766E]"
            />
          )}
        </button>
      </div>

      {/* Main Split-Screen Container (Desktop 55% / 45%, Mobile CSS Visibility Only — Never Unmount) */}
      <div className="flex flex-1 flex-col lg:h-[calc(100vh-68px)] lg:flex-row lg:overflow-hidden">
        <section
          aria-label="Panel Area Kerja"
          className={`w-full flex-col border-[#E2E8F0] bg-[#F8FAFC] lg:h-full lg:w-[55%] lg:overflow-hidden lg:border-r ${
            activeTab === 'work' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {leftPanel}
        </section>

        <section
          aria-label="Panel AI Mentor"
          className={`w-full flex-col bg-white lg:h-full lg:w-[45%] lg:overflow-hidden ${
            activeTab === 'mentor' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {rightPanel}
        </section>
      </div>
    </div>
  );
}
