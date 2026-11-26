import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Network } from 'lucide-react';

import { PretestRunner } from '@/components/pretest/PretestRunner';
import { getSessionFromCookies } from '@/lib/services/auth.service';
import { getPretestStateForStudent } from '@/lib/services/pretest.service';

export const metadata: Metadata = {
  title: 'Tes Pemetaan Awal — Nalar',
  description:
    'Tes pemetaan awal 6 soal singkat untuk menyesuaikan gaya bimbingan AI Nalar dengan kesiapan logika siswa.',
};

function PretestLoadingShell() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink-primary">
      <header className="sticky top-0 z-40 h-16 border-b border-borderline bg-surface/95">
        <div className="mx-auto flex h-full max-w-[680px] items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Network className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-ink-primary">
              Nalar
            </span>
          </div>
          <div className="h-4 w-32 animate-pulse rounded-md bg-slate-200" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 py-8">
        <div className="space-y-4 rounded-2xl border border-borderline bg-surface p-6">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="space-y-2.5 pt-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-12 w-full animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

async function PretestGuardLoader() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect('/');
  }

  const state = await getPretestStateForStudent(session.studentId);

  if (!state) {
    redirect('/');
  }

  if (state.completed) {
    redirect('/dashboard');
  }

  return (
    <PretestRunner
      studentName={state.student.nama}
      studentClass={state.student.kelas}
      questions={state.questions}
    />
  );
}

export default function PretestPage() {
  return (
    <Suspense fallback={<PretestLoadingShell />}>
      <PretestGuardLoader />
    </Suspense>
  );
}
