import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Network } from 'lucide-react';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { getSessionFromCookies } from '@/lib/services/auth.service';
import { getDashboardData } from '@/lib/services/mission-gate.service';

export const metadata: Metadata = {
  title: 'Peta Belajar — Nalar',
  description:
    'Jalur belajar vertikal 5 misi Berpikir Komputasional dan Transisi Python Nalar.',
};

function DashboardLoadingShell() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink-primary lg:flex-row">
      <aside className="hidden lg:flex lg:w-[230px] lg:shrink-0 lg:flex-col lg:border-r lg:border-borderline lg:bg-surface lg:p-4">
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <Network className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-ink-primary">
            Nalar
          </span>
        </div>
      </aside>
      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
        <div className="mx-auto w-full max-w-[540px] flex-1 space-y-5">
          <div className="h-32 w-full animate-pulse rounded-2xl bg-primary/20" />
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 w-full animate-pulse rounded-2xl border border-borderline bg-surface"
            />
          ))}
        </div>
        <div className="w-full space-y-4 lg:w-[290px]">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 w-full animate-pulse rounded-2xl border border-borderline bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

async function DashboardGuardLoader({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect('/');
  }

  const [data, resolvedSearchParams] = await Promise.all([
    getDashboardData(session.studentId),
    searchParams,
  ]);

  if (!data) {
    redirect('/');
  }

  if (data.student.pretestCompletedAt === null) {
    redirect('/pretest');
  }

  const rawNotice = resolvedSearchParams.notice;
  const notice = Array.isArray(rawNotice) ? rawNotice[0] : rawNotice;

  return <DashboardShell data={data} notice={notice} />;
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<DashboardLoadingShell />}>
      <DashboardGuardLoader searchParams={searchParams} />
    </Suspense>
  );
}
