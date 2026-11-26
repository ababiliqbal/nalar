import { NextResponse } from 'next/server';

import { getSessionFromCookies } from '@/lib/services/auth.service';
import { getDashboardData } from '@/lib/services/mission-gate.service';

export async function GET(): Promise<NextResponse> {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json(
      { error: 'Sesi tidak valid atau telah berakhir.' },
      { status: 401 }
    );
  }

  try {
    const data = await getDashboardData(session.studentId);

    if (!data) {
      return NextResponse.json(
        { error: 'Profil siswa tidak ditemukan.' },
        { status: 401 }
      );
    }

    if (data.student.pretestCompletedAt === null) {
      return NextResponse.json(
        {
          error: 'Selesaikan tes pemetaan awal terlebih dahulu.',
          redirectTo: '/pretest',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    const safeMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error('[GET /api/dashboard] Unexpected error:', safeMessage);
    return NextResponse.json(
      { error: 'Gagal memuat data dashboard. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
