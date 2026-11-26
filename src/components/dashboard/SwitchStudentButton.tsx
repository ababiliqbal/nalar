'use client';

import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';

export interface SwitchStudentButtonProps {
  variant?: 'sidebar' | 'topbar';
}

function clearNalarLocalStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('nalar_')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Abaikan jika browser membatasi akses localStorage
  }
}

export function SwitchStudentButton({
  variant = 'sidebar',
}: SwitchStudentButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleSwitchStudent() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Tetap lanjutkan pembersihan klien dan hard redirect
    } finally {
      clearNalarLocalStorage();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Hard navigation disengaja saat Ganti Siswa agar router cache bersih
      window.location.href = '/';
    }
  }

  if (variant === 'topbar') {
    return (
      <button
        type="button"
        onClick={handleSwitchStudent}
        disabled={isLoggingOut}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-borderline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
        ) : (
          <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
        )}
        <span>Ganti Siswa</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSwitchStudent}
      disabled={isLoggingOut}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-borderline bg-canvas px-3.5 py-2.5 text-sm font-semibold text-ink-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoggingOut ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
      ) : (
        <LogOut className="h-4 w-4" strokeWidth={2} />
      )}
      <span>{isLoggingOut ? 'Mengeluarkan...' : 'Ganti Siswa'}</span>
    </button>
  );
}
