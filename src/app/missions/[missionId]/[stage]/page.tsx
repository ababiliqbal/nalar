import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  BookOpen,
  Bot,
  FileCode2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

import { MissionWorkspaceShell } from '@/components/workspace/MissionWorkspaceShell';
import { getMissionById } from '@/lib/missions';
import {
  STAGE_META,
  buildPublicStagePayload,
  parseMissionRouteParams,
} from '@/lib/missions/workspace-helpers';
import { getSessionFromCookies } from '@/lib/services/auth.service';
import {
  assertStageAccess,
  getStageDraft,
  getStudentGateProfile,
} from '@/lib/services/mission-gate.service';
import { getRecentStageChatHistory } from '@/lib/services/telemetry.service';

export const metadata: Metadata = {
  title: 'Ruang Kerja Misi — Nalar',
  description:
    'Ruang kerja interaktif 4 tahap (Logic, Analysis, Evaluation, Coding) dengan bimbingan AI Mentor adaptif Nalar.',
};

interface MissionStagePageProps {
  params: Promise<{ missionId: string; stage: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
}

function WorkspaceLoadingShell() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] lg:h-screen lg:overflow-hidden">
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:px-6">
        <div className="h-5 w-48 animate-pulse rounded-md bg-slate-200" />
        <div className="hidden gap-3 md:flex">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-4 w-20 animate-pulse rounded bg-slate-200"
            />
          ))}
        </div>
        <div className="h-7 w-28 animate-pulse rounded-full bg-slate-200" />
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="w-full space-y-4 border-r border-[#E2E8F0] p-6 lg:w-[55%]">
          <div className="h-28 w-full animate-pulse rounded-2xl border border-[#E2E8F0] bg-white" />
          <div className="h-44 w-full animate-pulse rounded-2xl border border-[#E2E8F0] bg-white" />
        </div>
        <div className="hidden w-[45%] flex-col bg-white p-6 lg:flex">
          <div className="h-10 w-44 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-4 flex-1 animate-pulse rounded-2xl bg-[#F8FAFC]" />
        </div>
      </div>
    </div>
  );
}

async function MissionWorkspaceLoader({
  params,
  searchParams,
}: MissionStagePageProps) {
  // 1. Validasi parameter rute ketat
  const { missionId: rawMissionId, stage: rawStage } = await params;
  const parsed = parseMissionRouteParams(rawMissionId, rawStage);
  if (!parsed) {
    redirect('/dashboard');
  }

  // 2. Verifikasi sesi HttpOnly cookie
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/');
  }

  // 3. Verifikasi profil & kelulusan pretest dari Supabase
  const studentProfile = await getStudentGateProfile(session.studentId);
  if (!studentProfile) {
    redirect('/');
  }
  if (!studentProfile.pretestCompleted) {
    redirect('/pretest');
  }

  // 4. Otorisasi stage & mission gating ketat di server
  const access = await assertStageAccess(
    session.studentId,
    parsed.missionId,
    parsed.stage
  );
  if (!access.allowed || !access.progress) {
    redirect(access.redirectUrl ?? '/dashboard');
  }

  const mission = getMissionById(parsed.missionId);
  if (!mission) {
    redirect('/dashboard');
  }

  // Proyeksi DTO publik aman (tanpa rubricCriteria & staticHints)
  const payload = buildPublicStagePayload(mission, parsed.stage);

  const [initialDraft, recentHistory, resolvedSearchParams] = await Promise.all(
    [
      getStageDraft(session.studentId, parsed.missionId, parsed.stage),
      getRecentStageChatHistory(
        session.studentId,
        parsed.missionId,
        parsed.stage,
        8
      ),
      searchParams,
    ]
  );

  const rawNotice = resolvedSearchParams.notice;
  const notice = Array.isArray(rawNotice) ? rawNotice[0] : rawNotice;
  const stageMeta = STAGE_META[parsed.stage];

  const leftPanel = (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {/* Case Study Card */}
        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F766E]">
              <BookOpen className="h-4 w-4" strokeWidth={2} />
              <span>Studi Kasus · Misi {payload.missionId}</span>
            </div>
            <span className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#475569]">
              {payload.kkaTopic}
            </span>
          </div>

          <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A] sm:text-xl">
            {payload.title}
          </h1>
          <p className="mt-1 text-xs font-medium text-[#475569] sm:text-sm">
            {payload.subtitle}
          </p>

          <div className="mt-4 space-y-2.5 border-t border-[#E2E8F0] pt-4 text-sm leading-relaxed text-[#0F172A] whitespace-pre-line">
            {payload.caseNarrative}
          </div>
        </article>

        {/* Active Stage Instruction Card */}
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#0F766E] font-mono text-xs font-bold text-white">
              {stageMeta.stepNumber}
            </span>
            <h2 className="text-sm font-bold text-[#0F172A] sm:text-base">
              Tahap {stageMeta.stepNumber}: {stageMeta.shortLabel} —{' '}
              {stageMeta.title}
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-[#475569]">
            {payload.stagePrompt}
          </p>

          {payload.edgeCaseScenario && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#D97706]">
                <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                <span>Skenario Kasus Ekstrem (Edge Case)</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-950 sm:text-sm">
                {payload.edgeCaseScenario}
              </p>
            </div>
          )}

          {/* Slot Placeholder for 3B.2 (StageInputAdapter) & 3C (CodeMirror + Pyodide) */}
          <div className="mt-5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#475569]">
              <FileCode2 className="h-4 w-4 text-[#0F766E]" strokeWidth={2} />
              <span>
                {payload.stage === 'coding'
                  ? 'Slot Editor Python CodeMirror 6 & Pyodide Runner (Tahap 3C)'
                  : 'Slot Editor Jawaban, Auto-Save, & Auto-Hint (Tahap 3B.2)'}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#64748B]">
              {initialDraft.length > 0
                ? `Draf tersimpan terdeteksi (${initialDraft.length} karakter) dan siap dimuat ke editor.`
                : 'Belum ada draf tersimpan untuk tahap ini.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* AI Chat Mentor Header (Fixed 52px) */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#E2E8F0] px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#0F766E]/20 bg-[#F0FDFA] text-[#0F766E]">
            <Bot className="h-4 w-4" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold text-[#0F172A]">
            AI Chat Mentor
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#16A34A]/30 bg-[#16A34A]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#16A34A]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          <span>Aktif Membimbing</span>
        </span>
      </div>

      {/* Scrollable Placeholder Chat Body (Ready for 3B.3) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F1F5F9] p-4 text-sm leading-relaxed text-[#0F172A]">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#0F766E]">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Mentor Nalar</span>
            </div>
            <p className="text-xs leading-relaxed text-[#475569] sm:text-sm">
              Halo! Aku siap membimbingmu di{' '}
              <strong className="font-semibold text-[#0F172A]">
                Misi {payload.missionId} · {stageMeta.label}
              </strong>
              . Panel interaksi chat Sokratis &amp; umpan balik rubrik akan
              terhubung penuh pada langkah berikutnya.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-xs text-[#64748B]">
            <MessageSquare className="h-4 w-4 shrink-0 text-[#475569]" strokeWidth={2} />
            <span>
              Riwayat percakapan tahap ini di database: {recentHistory.length}{' '}
              pesan.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar Placeholder */}
      <div className="shrink-0 border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 sm:px-5">
        <p className="text-center text-xs text-[#64748B]">
          Input diskusi AI Mentor &amp; tombol lanjut tahap akan aktif di 3B.3.
        </p>
      </div>
    </div>
  );

  return (
    <MissionWorkspaceShell
      payload={payload}
      progress={{
        logic_passed: access.progress.logic_passed,
        analysis_passed: access.progress.analysis_passed,
        evaluation_passed: access.progress.evaluation_passed,
        coding_passed: access.progress.coding_passed,
      }}
      currentLevel={studentProfile.currentLevel}
      notice={notice}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}

export default function MissionStagePage({
  params,
  searchParams,
}: MissionStagePageProps) {
  return (
    <Suspense fallback={<WorkspaceLoadingShell />}>
      <MissionWorkspaceLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}
