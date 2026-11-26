'use client';

import Image from 'next/image';
import { Code2 } from 'lucide-react';

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[440px] py-4 sm:px-6 sm:py-6">
      {/* Subtle Geometric Background Shapes */}
      <div
        aria-hidden="true"
        className="bg-nalar-dots pointer-events-none absolute right-2 top-0 h-28 w-28 rounded-2xl opacity-80 sm:right-0 sm:h-32 sm:w-32"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-1 left-2 h-44 w-44 rounded-full bg-primary/10 sm:left-0 sm:h-52 sm:w-52"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-14 h-56 w-56 rotate-6 rounded-[3rem] bg-primary/15 sm:right-2 sm:h-64 sm:w-64"
      />

      {/* Minimal Geometric Accents (Ring & Dot) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-6 top-6 h-5 w-5 rounded-full border-[3px] border-highlight sm:left-4"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 right-5 h-3 w-3 rounded-full bg-primary sm:right-2"
      />

      {/* Main Framed Studio Portrait */}
      <div className="relative mx-auto w-[88%] max-w-[360px] sm:w-[86%]">
        {/* Offset solid teal architectural shape behind frame */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -bottom-3 -right-3 rounded-t-[10rem] rounded-b-[2.25rem] bg-primary"
        />

        {/* Portrait container */}
        <div className="relative aspect-[3/3.75] overflow-hidden rounded-t-[10rem] rounded-b-[2.25rem] border-4 border-surface bg-[#F0FDFA] ring-1 ring-borderline">
          <Image
            src="/images/hero-student.jpg"
            alt="Siswa SMA memegang laptop saat belajar logika dan Python di Nalar"
            fill
            priority
            sizes="(max-width: 640px) 85vw, 360px"
            className="object-cover object-top"
          />
        </div>

        {/* Minimal Floating Code Icon Accent (Top-Left) */}
        <div
          aria-hidden="true"
          className="absolute -left-3 top-14 hidden h-12 w-12 items-center justify-center rounded-2xl border border-borderline bg-surface text-primary shadow-[0_10px_24px_-12px_rgba(15,23,42,0.18)] sm:flex"
        >
          <Code2 className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
