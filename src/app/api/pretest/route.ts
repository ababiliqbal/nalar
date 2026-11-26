import { NextResponse } from 'next/server';

import { getSessionFromCookies } from '@/lib/services/auth.service';
import { getPretestStateForStudent } from '@/lib/services/pretest.service';

export async function GET(): Promise<NextResponse> {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json(
      { error: 'Sesi tidak valid atau telah berakhir.' },
      { status: 401 }
    );
  }

  try {
    const state = await getPretestStateForStudent(session.studentId);

    if (!state) {
      return NextResponse.json(
        { error: 'Data siswa tidak ditemukan.' },
        { status: 401 }
      );
    }

    if (state.completed) {
      return NextResponse.json(
        {
          error: 'Pretest sudah diselesaikan sebelumnya.',
          redirectTo: '/dashboard',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { questions: state.questions },
      { status: 200 }
    );
  } catch (error: unknown) {
    const safeMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error('[GET /api/pretest] Unexpected error:', safeMessage);
    return NextResponse.json(
      { error: 'Gagal memuat soal pretest. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
