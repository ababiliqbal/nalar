'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, Terminal } from 'lucide-react';

const HINT_MESSAGES = [
  'Coba cek ulang urutan if-elif: kondisi mana yang harus diperiksa lebih dulu saat cuaca cerah?',
  'Pastikan ada cabang else untuk kondisi ekstrem ketika semua jalur tidak bisa dilalui.',
] as const;

const CODE_LINES = [
  'def pilih_rute(hujan, banjir, punya_uang):',
  '    if not hujan:',
  '        return "Jalur A"',
  '    elif not banjir:',
  '        return "Jalur B"',
  '    elif punya_uang:',
  '        return "Jalur C"',
  '    else:',
  '        return "Tidak Ada Jalur Aman"',
] as const;

export function HeroPreviewCard() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fullText = HINT_MESSAGES[messageIndex];

    if (prefersReducedMotion) {
      const immediateTimer = window.setTimeout(() => {
        setVisibleChars(fullText.length);
      }, 0);
      return () => window.clearTimeout(immediateTimer);
    }

    if (visibleChars < fullText.length) {
      const typingTimer = window.setTimeout(() => {
        setVisibleChars((prev) => prev + 1);
      }, 32);
      return () => window.clearTimeout(typingTimer);
    }

    const pauseTimer = window.setTimeout(() => {
      setMessageIndex((prev) => (prev + 1) % HINT_MESSAGES.length);
      setVisibleChars(0);
    }, 3200);

    return () => window.clearTimeout(pauseTimer);
  }, [messageIndex, visibleChars]);

  const displayedHint = HINT_MESSAGES[messageIndex].slice(0, visibleChars);

  return (
    <div className="relative rounded-2xl border border-borderline bg-nalar-dots p-3 sm:p-5">
      <div className="overflow-hidden rounded-xl border border-borderline bg-surface">
        {/* Top Workspace Chrome */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderline bg-canvas/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-passed" />
            <span className="text-xs font-semibold text-ink-primary">
              Misi 1 · Rute Terbaik ke Sekolah
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="hidden items-center gap-1 sm:flex"
              aria-label="Progres 4 tahap misi"
            >
              {(['Logic', 'Analysis', 'Eval'] as const).map((stage) => (
                <span
                  key={stage}
                  className="inline-flex items-center gap-1 rounded-md border border-passed/30 bg-passed/10 px-1.5 py-0.5 text-[11px] font-medium text-passed"
                >
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                  {stage}
                </span>
              ))}
              <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                Coding
              </span>
            </div>

            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-highlight">
              Level 2: Builder
            </span>
          </div>
        </div>

        {/* Code Editor Mock */}
        <div className="grid grid-cols-1 divide-y divide-borderline md:grid-cols-12 md:divide-x md:divide-y-0">
          <div className="flex flex-col md:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-700/80 bg-editor px-3.5 py-2 text-[11px] font-mono text-slate-300">
              <span>solusi_misi_1.py</span>
              <span className="text-slate-400">Python 3 · Pyodide</span>
            </div>

            <div className="overflow-x-auto bg-editor px-3 py-3 font-mono text-xs leading-6 text-slate-100">
              {CODE_LINES.map((line, index) => (
                <div key={index} className="flex min-w-max gap-3">
                  <span className="w-4 select-none text-right text-slate-500">
                    {index + 1}
                  </span>
                  <code className="whitespace-pre text-slate-100">{line}</code>
                </div>
              ))}
            </div>

            {/* Inline Auto-Hint Strip */}
            <div className="border-t border-amber-200 bg-[#FFFBEB] px-3.5 py-2.5">
              <div className="flex items-start gap-2">
                <Sparkles
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-highlight"
                  strokeWidth={2}
                />
                <div className="min-h-[36px] text-xs leading-relaxed text-amber-950">
                  <span className="mr-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-highlight">
                    AI Hint:
                  </span>
                  <span className="font-mono text-[11.5px]">
                    {displayedHint}
                    <span
                      aria-hidden="true"
                      className="animate-nalar-caret ml-0.5 inline-block h-3.5 w-1.5 align-middle bg-highlight"
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Mini AI Mentor & Test Output */}
          <div className="flex flex-col justify-between bg-surface p-3.5 md:col-span-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-primary">
                  AI Mentor Sokratis
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-passed">
                  <span className="h-1.5 w-1.5 rounded-full bg-passed" />
                  Aktif
                </span>
              </div>

              <div className="rounded-lg border border-borderline bg-chat-ai p-2.5 text-xs leading-relaxed text-ink-secondary">
                Bagus! Sebelum menjalankan kode, coba bayangkan apa hasilnya jika
                hujan, banjir, dan Mamat tidak membawa uang tol bersamaan.
              </div>

              <div className="ml-4 rounded-lg bg-primary px-2.5 py-2 text-xs leading-relaxed text-white">
                Semua syarat if/elif salah, jadi masuk cabang else!
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-borderline bg-terminal p-2.5 font-mono text-[11px] text-slate-200">
              <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                <Terminal className="h-3 w-3" strokeWidth={2} />
                <span>Output Pengujian</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <span>6/6 unit test lulus (0.04s)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
