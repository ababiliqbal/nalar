import { NextResponse } from 'next/server';

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getSessionFromCookies,
  signSessionToken,
} from '@/lib/services/auth.service';
import {
  PretestAlreadyCompletedError,
  PretestStudentNotFoundError,
  submitPretest,
} from '@/lib/services/pretest.service';
import { pretestSubmitSchema } from '@/lib/validation/schemas';

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json(
      { error: 'Sesi tidak valid atau telah berakhir.' },
      { status: 401 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format data pengiriman pretest tidak valid.' },
      { status: 400 }
    );
  }

  const parsed = pretestSubmitSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error:
          firstIssue?.message ??
          'Pastikan seluruh 6 soal telah dijawab dengan pilihan A, B, C, atau D.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const result = await submitPretest(
      session.studentId,
      parsed.data.answers,
      parsed.data.durationSec
    );

    const updatedToken = await signSessionToken({
      studentId: session.studentId,
      currentLevel: result.level,
      pretestCompleted: true,
    });

    const response = NextResponse.json(result, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, updatedToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof PretestAlreadyCompletedError) {
      return NextResponse.json(
        {
          error: error.message,
          redirectTo: '/dashboard',
        },
        { status: 409 }
      );
    }

    if (error instanceof PretestStudentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const safeMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error('[POST /api/pretest/submit] Unexpected error:', safeMessage);
    return NextResponse.json(
      { error: 'Terjadi gangguan saat menyimpan hasil pretest. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
