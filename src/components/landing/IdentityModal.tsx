'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
} from 'lucide-react';

import {
  DDMM_PIN_REGEX,
  authSessionSchema,
} from '@/lib/validation/schemas';

export interface IdentityModalProps {
  isOpen: boolean;
  mode: 'start' | 'resume';
  onClose: () => void;
}

interface AuthSessionApiResponse {
  studentId?: string;
  redirectTo?: '/pretest' | '/dashboard';
  error?: string;
}

export function IdentityModal({ isOpen, mode, onClose }: IdentityModalProps) {
  const router = useRouter();
  const titleId = useId();
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const [nama, setNama] = useState('');
  const [nisn, setNisn] = useState('');
  const [kelas, setKelas] = useState('');
  const [sekolah, setSekolah] = useState('');
  const [pin, setPin] = useState('');
  const [consent, setConsent] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validation = useMemo(
    () =>
      authSessionSchema.safeParse({
        nama,
        nisn,
        kelas,
        sekolah,
        pin,
        consent,
      }),
    [nama, nisn, kelas, sekolah, pin, consent]
  );

  const isFormValid = validation.success;

  const pinFormatWarning =
    pin.length === 4 && !DDMM_PIN_REGEX.test(pin)
      ? 'Format DDMM tidak valid. Tanggal 01–31 dan bulan 01–12 (contoh: 1708).'
      : null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid || isSubmitting) {
      return;
    }

    setApiError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama: nama.trim(),
          nisn: nisn.trim(),
          kelas: kelas.trim(),
          sekolah: sekolah.trim(),
          pin: pin.trim(),
          consent: true,
        }),
      });

      const data = (await response.json()) as AuthSessionApiResponse;

      if (!response.ok) {
        setApiError(
          data.error ?? 'Gagal masuk ke sesi belajar. Periksa kembali datamu.'
        );
        setIsSubmitting(false);
        return;
      }

      const targetPath = data.redirectTo ?? '/pretest';
      onClose();
      router.push(targetPath);
      router.refresh();
    } catch {
      setApiError(
        'Koneksi ke server terputus. Pastikan internet terhubung lalu coba lagi.'
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-primary/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-borderline bg-surface">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-borderline px-5 py-4 sm:px-6">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <LockKeyhole className="h-3 w-3" strokeWidth={2} />
              Tanpa Email & Password
            </div>
            <h2
              id={titleId}
              className="text-lg font-bold tracking-tight text-ink-primary"
            >
              {mode === 'resume'
                ? 'Lanjutkan Sesi dengan NISN'
                : 'Identitas Siswa untuk Memulai'}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
              {mode === 'resume'
                ? 'Masukkan NISN, Asal Sekolah, dan PIN DDMM yang pernah kamu gunakan agar progres belajarmu langsung dipulihkan.'
                : 'Lengkapi data singkat di bawah ini untuk memulai tes pemetaan awal dan menyimpan progres 5 misimu.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup modal identitas"
            className="cursor-pointer rounded-lg border border-transparent p-1.5 text-ink-muted transition-colors hover:border-borderline hover:bg-canvas hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-6" noValidate>
          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{apiError}</span>
            </div>
          )}

          {/* Nama Lengkap */}
          <div>
            <label
              htmlFor="nalar-nama"
              className="mb-1.5 block text-xs font-semibold text-ink-primary"
            >
              Nama Lengkap
            </label>
            <input
              ref={firstInputRef}
              id="nalar-nama"
              name="nama"
              type="text"
              autoComplete="name"
              required
              value={nama}
              onChange={(event) => {
                setNama(event.target.value);
                setApiError(null);
              }}
              placeholder="Contoh: Raka Pratama"
              className="w-full rounded-xl border border-borderline bg-surface px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {/* NISN & Kelas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-7">
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="nalar-nisn"
                  className="text-xs font-semibold text-ink-primary"
                >
                  NISN (10 digit)
                </label>
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    nisn.length === 10 ? 'text-passed' : 'text-ink-muted'
                  }`}
                >
                  {nisn.length}/10
                </span>
              </div>
              <input
                id="nalar-nisn"
                name="nisn"
                type="text"
                inputMode="numeric"
                maxLength={10}
                required
                value={nisn}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 10);
                  setNisn(digitsOnly);
                  setApiError(null);
                }}
                placeholder="0091234567"
                className="w-full rounded-xl border border-borderline bg-surface px-3.5 py-2.5 font-mono text-sm tracking-wider text-ink-primary placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="sm:col-span-5">
              <label
                htmlFor="nalar-kelas"
                className="mb-1.5 block text-xs font-semibold text-ink-primary"
              >
                Kelas
              </label>
              <input
                id="nalar-kelas"
                name="kelas"
                type="text"
                required
                value={kelas}
                onChange={(event) => {
                  setKelas(event.target.value);
                  setApiError(null);
                }}
                placeholder="Contoh: X-2"
                className="w-full rounded-xl border border-borderline bg-surface px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>

          {/* Asal Sekolah */}
          <div>
            <label
              htmlFor="nalar-sekolah"
              className="mb-1.5 block text-xs font-semibold text-ink-primary"
            >
              Asal Sekolah
            </label>
            <input
              id="nalar-sekolah"
              name="sekolah"
              type="text"
              required
              value={sekolah}
              onChange={(event) => {
                setSekolah(event.target.value);
                setApiError(null);
              }}
              placeholder="Contoh: SMAN 1 Yogyakarta"
              className="w-full rounded-xl border border-borderline bg-surface px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {/* PIN 4 Digit DDMM */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="nalar-pin"
                className="text-xs font-semibold text-ink-primary"
              >
                PIN Tanggal & Bulan Lahir 4 digit (DDMM)
              </label>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  DDMM_PIN_REGEX.test(pin) ? 'text-passed' : 'text-ink-muted'
                }`}
              >
                {pin.length}/4
              </span>
            </div>

            <div className="relative">
              <input
                id="nalar-pin"
                name="pin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                required
                value={pin}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(digitsOnly);
                  setApiError(null);
                }}
                placeholder="1708"
                className="w-full rounded-xl border border-borderline bg-surface py-2.5 pl-3.5 pr-10 font-mono text-sm tracking-[0.25em] text-ink-primary placeholder:tracking-normal placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1 text-ink-muted transition-colors hover:bg-canvas hover:text-ink-primary"
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            </div>

            {pinFormatWarning ? (
              <p className="mt-1.5 text-[11.5px] font-medium text-red-600">
                {pinFormatWarning}
              </p>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-ink-muted">
                Contoh: 1708 untuk 17 Agustus
              </p>
            )}
          </div>

          {/* Checkbox Persetujuan Data */}
          <label
            htmlFor="nalar-consent"
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-borderline bg-canvas p-3.5 transition-colors hover:border-primary/40"
          >
            <input
              id="nalar-consent"
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                setApiError(null);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-borderline accent-primary"
            />
            <span className="text-xs leading-relaxed text-ink-secondary">
              Saya menyetujui penyimpanan progres latihan, jawaban tahapan, dan
              log interaksi belajar secara aman untuk keperluan pembelajaran &
              penelitian KKA (identitas pribadi tidak pernah dikirim ke AI).
            </span>
          </label>

          {/* Footer Submit */}
          <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
              <span>Sesi dilindungi cookie terenkripsi</span>
            </div>

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  <span>Memproses...</span>
                </>
              ) : mode === 'resume' ? (
                <span>Masuk & Lanjutkan</span>
              ) : (
                <span>Mulai Sesi Belajar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
