import { NextResponse } from 'next/server';

import {
  AuthCredentialsError,
  GENERIC_AUTH_ERROR_MESSAGE,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  authenticateOrRegister,
} from '@/lib/services/auth.service';
import { authSessionSchema } from '@/lib/validation/schemas';

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format data permintaan tidak valid.' },
      { status: 400 }
    );
  }

  const parsed = authSessionSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message ?? 'Data identitas belum lengkap atau tidak valid.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const result = await authenticateOrRegister(parsed.data);

    const response = NextResponse.json(
      {
        studentId: result.studentId,
        redirectTo: result.redirectTo,
      },
      { status: result.isNewUser ? 201 : 200 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof AuthCredentialsError) {
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR_MESSAGE },
        { status: 401 }
      );
    }

    const safeMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error('[POST /api/auth/session] Unexpected error:', safeMessage);
    return NextResponse.json(
      {
        error: 'Terjadi gangguan saat memproses sesi. Silakan coba beberapa saat lagi.',
      },
      { status: 500 }
    );
  }
}
