'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Loader2,
  Network,
  Sparkles,
} from 'lucide-react';

import { SCAFFOLDING_LEVELS } from '@/lib/constants/levels';
import type {
  PretestOptionKey,
  PretestQuestionPublic,
  ScaffoldingLevelCode,
} from '@/lib/types/domain';

export interface PretestRunnerProps {
  studentName: string;
  studentClass: string;
  questions: readonly PretestQuestionPublic[];
}

interface PretestSubmitResultState {
  score: number;
  total: number;
  level: ScaffoldingLevelCode;
  label: string;
  description: string;
}

interface PretestApiErrorResponse {
  error?: string;
  redirectTo?: string;
}

function ResultSummary({ result }: { result: PretestSubmitResultState }) {
  const levelConfig = SCAFFOLDING_LEVELS[result.level];

  return (
    <section
      aria-label="Hasil Tes Pemetaan Awal"
      className="mx-auto w-full max-w-[680px] flex-1 px-4 py-8 sm:py-12"
    >
      <div className="overflow-hidden rounded-2xl border border-borderline bg-surface">
        {/* Header Banner */}
        <div className="border-b border-borderline bg-canvas/70 px-6 py-7 text-center sm:px-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-passed/25 bg-passed/10 text-passed">
            <Award className="h-6 w-6" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-primary sm:text-3xl">
            Pemetaan Awal Selesai!
          </h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Gaya bimbingan AI Nalar sudah disesuaikan dengan kesiapan logikamu.
          </p>
        </div>

        {/* Score & Level */}
        <div className="space-y-6 px-6 py-7 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-borderline bg-canvas p-5 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Skor Pemetaan
              </p>
              <p className="mt-1 font-mono text-3xl font-extrabold text-ink-primary">
                {result.score}{' '}
                <span className="text-lg font-semibold text-ink-muted">
                  / {result.total}
                </span>
              </p>
            </div>

            <div className="flex flex-col items-center gap-1.5 sm:items-end">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Level Bimbingan Awal
              </p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold ${levelConfig.badge.className}`}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                <span>{result.label}</span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-borderline bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Gaya Bimbingan AI Untukmu
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary sm:text-base">
              {result.description}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-1">
            <Link
              href="/dashboard"
              className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_10px_24px_-10px_rgba(15,118,110,0.65)] active:translate-y-0 sm:w-auto"
            >
              <span>Buka Peta Belajar</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                strokeWidth={2}
              />
            </Link>
            <p className="text-center text-xs text-ink-muted">
              Level bimbingan ini bisa beradaptasi otomatis seiring kemajuanmu
              di setiap misi.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PretestRunner({
  studentName,
  studentClass,
  questions,
}: PretestRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Partial<Record<string, PretestOptionKey>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [conflictRedirect, setConflictRedirect] = useState<string | null>(null);
  const [result, setResult] = useState<PretestSubmitResultState | null>(null);

  const startedAtRef = useRef<number | null>(null);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const selectedForCurrent = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
  const allAnswered = answeredCount === totalQuestions;
  const progressPercent =
    totalQuestions > 0
      ? Math.round(((currentIndex + 1) / totalQuestions) * 100)
      : 0;

  function handleSelectOption(questionId: string, optionKey: PretestOptionKey) {
    if (isSubmitting) {
      return;
    }
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
    setApiError(null);
  }

  function handlePrevious() {
    if (isFirstQuestion || isSubmitting) {
      return;
    }
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setApiError(null);
  }

  function handleNext() {
    if (!selectedForCurrent || isLastQuestion || isSubmitting) {
      return;
    }
    setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1));
    setApiError(null);
  }

  async function handleSubmit() {
    if (!allAnswered || isSubmitting || hasSubmittedRef.current) {
      return;
    }

    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    setApiError(null);
    setConflictRedirect(null);

    const startedAt = startedAtRef.current ?? Date.now();
    const durationSec = Math.max(
      0,
      Math.round((Date.now() - startedAt) / 1000)
    );

    try {
      const response = await fetch('/api/pretest/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
          durationSec,
        }),
      });

      const data = (await response.json()) as Partial<PretestSubmitResultState> &
        PretestApiErrorResponse;

      if (!response.ok) {
        if (response.status === 409) {
          setApiError(
            data.error ?? 'Pretest sudah pernah diselesaikan sebelumnya.'
          );
          setConflictRedirect(data.redirectTo ?? '/dashboard');
          setIsSubmitting(false);
          return;
        }

        hasSubmittedRef.current = false;
        setApiError(
          data.error ?? 'Gagal mengirim jawaban pretest. Silakan coba lagi.'
        );
        setIsSubmitting(false);
        return;
      }

      if (
        typeof data.score === 'number' &&
        typeof data.total === 'number' &&
        data.level &&
        typeof data.label === 'string' &&
        typeof data.description === 'string'
      ) {
        setResult({
          score: data.score,
          total: data.total,
          level: data.level,
          label: data.label,
          description: data.description,
        });
      } else {
        hasSubmittedRef.current = false;
        setApiError('Respons penilaian dari server tidak lengkap.');
        setIsSubmitting(false);
      }
    } catch {
      hasSubmittedRef.current = false;
      setApiError(
        'Koneksi ke server terputus. Pastikan internet terhubung lalu coba kirim ulang.'
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink-primary">
      {/* Minimal Sticky Navbar 64px */}
      <header className="sticky top-0 z-40 h-16 border-b border-borderline bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-[680px] items-center justify-between gap-3 px-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Network className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-ink-primary">
              Nalar
            </span>
          </div>

          <div className="min-w-0 truncate rounded-full border border-borderline bg-canvas px-3 py-1 text-xs font-semibold text-ink-secondary">
            <span className="text-ink-primary">{studentName}</span>
            <span className="mx-1.5 text-ink-muted">&bull;</span>
            <span>{studentClass}</span>
          </div>
        </div>
      </header>

      {result ? (
        <ResultSummary result={result} />
      ) : (
        <main className="mx-auto w-full max-w-[680px] flex-1 px-4 py-6 sm:py-9">
          {/* Progress Header */}
          <div className="mb-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="text-ink-primary">
                Soal {currentIndex + 1} dari {totalQuestions}
              </span>
              <span className="inline-flex items-center gap-1.5 text-ink-muted">
                <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                <span>&plusmn; 3 Menit</span>
              </span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-borderline"
              role="progressbar"
              aria-valuenow={currentIndex + 1}
              aria-valuemin={1}
              aria-valuemax={totalQuestions}
              aria-label={`Progres tes pemetaan awal: soal ${currentIndex + 1} dari ${totalQuestions}`}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Compact Question Step Dots */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              <div className="flex items-center gap-1.5">
                {questions.map((question, idx) => {
                  const isAnswered = Boolean(answers[question.id]);
                  const isActive = idx === currentIndex;
                  const canJump = isAnswered || idx <= currentIndex;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      disabled={!canJump || isSubmitting}
                      onClick={() => {
                        if (canJump && !isSubmitting) {
                          setCurrentIndex(idx);
                          setApiError(null);
                        }
                      }}
                      aria-label={`Buka soal ${question.number}`}
                      className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : isAnswered
                            ? 'cursor-pointer border border-primary/30 bg-[#F0FDFA] text-primary hover:bg-primary/15'
                            : 'cursor-not-allowed border border-borderline bg-surface text-ink-muted'
                      }`}
                    >
                      {question.number}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11.5px] font-medium text-ink-muted">
                Terjawab {answeredCount}/{totalQuestions}
              </span>
            </div>
          </div>

          {/* Question Card */}
          {currentQuestion && (
            <article className="rounded-2xl border border-borderline bg-surface p-5 sm:p-7">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="rounded-md border border-borderline bg-canvas px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary">
                  {currentQuestion.category}
                </span>
                <span className="font-mono text-xs text-ink-muted">
                  #{currentQuestion.number}
                </span>
              </div>

              <h1 className="text-base font-semibold leading-relaxed text-ink-primary sm:text-[17px]">
                {currentQuestion.question}
              </h1>

              {/* Optional Pseudocode Block (#1E293B + JetBrains Mono) */}
              {currentQuestion.codeSnippet && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-700 bg-editor">
                  <div className="flex items-center justify-between border-b border-slate-700/80 px-3.5 py-2 font-mono text-[11px] text-slate-400">
                    <span>Pseudocode</span>
                    <span>Langkah Eksekusi</span>
                  </div>
                  <pre className="overflow-x-auto px-4 py-3.5 font-mono text-xs leading-6 text-slate-100 sm:text-[13px]">
                    <code>{currentQuestion.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* 4 Options A-D */}
              <div
                role="radiogroup"
                aria-label={`Pilihan jawaban soal ${currentQuestion.number}`}
                className="mt-5 space-y-2.5"
              >
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedForCurrent === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={isSubmitting}
                      onClick={() =>
                        handleSelectOption(currentQuestion.id, option.key)
                      }
                      className={`group flex w-full cursor-pointer items-start gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-65 ${
                        isSelected
                          ? 'border-primary bg-[#F0FDFA] ring-1 ring-primary/20'
                          : 'border-borderline bg-surface hover:border-primary/40 hover:bg-canvas'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'border border-borderline bg-canvas text-ink-secondary group-hover:border-primary/40 group-hover:text-primary'
                        }`}
                      >
                        {option.key}
                      </span>
                      <span className="flex-1 pt-0.5 text-sm leading-relaxed text-ink-primary">
                        {option.label}
                      </span>
                      {isSelected && (
                        <CheckCircle2
                          className="mt-1 h-4 w-4 shrink-0 text-primary"
                          strokeWidth={2}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Error Alert */}
              {apiError && (
                <div
                  role="alert"
                  className="mt-5 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      strokeWidth={2}
                    />
                    <span>{apiError}</span>
                  </div>
                  {conflictRedirect && (
                    <Link
                      href={conflictRedirect}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-red-700 px-3 py-1.5 font-semibold text-white hover:bg-red-800"
                    >
                      <span>Ke Peta Belajar</span>
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </Link>
                  )}
                </div>
              )}

              {/* Navigation Action Bar */}
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-borderline pt-5">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={isFirstQuestion || isSubmitting}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-borderline bg-surface px-4 py-2.5 text-sm font-semibold text-ink-secondary transition-all duration-150 hover:border-primary/40 hover:bg-canvas hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                  <span>Sebelumnya</span>
                </button>

                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allAnswered || isSubmitting}
                    className="group inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          strokeWidth={2}
                        />
                        <span>Menilai Jawaban...</span>
                      </>
                    ) : (
                      <>
                        <span>Selesai Tes</span>
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!selectedForCurrent || isSubmitting}
                    className="group inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    <span>Selanjutnya</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      strokeWidth={2}
                    />
                  </button>
                )}
              </div>
            </article>
          )}
        </main>
      )}
    </div>
  );
}
